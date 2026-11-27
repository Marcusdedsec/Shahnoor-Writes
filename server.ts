import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8')) as {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
};

const PRIMARY_ADMIN_EMAIL = 'realzuhaan@gmail.com';
const MODEL_NAME = 'gemini-4-hydrogen';

type AssistantMode =
  | 'chat'
  | 'outline'
  | 'refine'
  | 'grammar'
  | 'suggestions'
  | 'continue'
  | 'metadata'
  | 'review';

interface DraftContext {
  title?: string;
  subtitle?: string;
  excerpt?: string;
  content?: string;
  selectedText?: string;
  category?: string;
  tags?: string[];
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseAdminToken(idToken: string): Promise<VerifiedUser> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!res.ok) {
    throw new Error('Invalid or expired session token.');
  }

  const data = (await res.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
    }>;
  };

  const user = data.users?.[0];
  if (!user || !user.localId || !user.email) {
    throw new Error('Unable to verify account identity.');
  }

  const normalizedEmail = user.email.toLowerCase();
  const isVerifiedPrimary =
    Boolean(user.emailVerified) && normalizedEmail === PRIMARY_ADMIN_EMAIL;

  let isAuthorized = isVerifiedPrimary;

  if (!isAuthorized) {
    const baseFirestoreUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId,
    )}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents`;

    // Check claimed author owner record (/appConfig/author)
    const authorDocRes = await fetch(`${baseFirestoreUrl}/appConfig/author`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (authorDocRes.ok) {
      const authorDoc = (await authorDocRes.json()) as {
        fields?: { ownerUid?: { stringValue?: string } };
      };
      if (authorDoc.fields?.ownerUid?.stringValue === user.localId) {
        isAuthorized = true;
      }
    }

    // Fallback check against /admins/{uid}
    if (!isAuthorized) {
      const adminRes = await fetch(
        `${baseFirestoreUrl}/admins/${encodeURIComponent(user.localId)}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
      if (adminRes.ok) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw new Error('Only authorized authors may access the Writing Assistant.');
  }

  return {
    uid: user.localId,
    email: normalizedEmail,
    emailVerified: Boolean(user.emailVerified),
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildDraftSnapshot(draft?: DraftContext): string {
  if (!draft) return 'No draft content provided yet.';
  const title = (draft.title ?? '').trim().slice(0, 200);
  const subtitle = (draft.subtitle ?? '').trim().slice(0, 300);
  const excerpt = (draft.excerpt ?? '').trim().slice(0, 500);
  const category = (draft.category ?? 'Essays').trim().slice(0, 60);
  const tags = Array.isArray(draft.tags) ? draft.tags.slice(0, 10).join(', ') : '';
  const selectedText = (draft.selectedText ?? '').trim().slice(0, 8000);
  const content = (draft.content ?? '').trim().slice(0, 24000);

  return [
    `Category: ${category}`,
    `Title: ${title || '(Untitled)'}`,
    subtitle ? `Subtitle: ${subtitle}` : '',
    excerpt ? `Excerpt: ${excerpt}` : '',
    tags ? `Tags: ${tags}` : '',
    selectedText ? `Highlighted Passage Selected by Author:\n${selectedText}` : '',
    `Manuscript Body:\n${content || '(Empty manuscript)'}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const EDITORIAL_SYSTEM_INSTRUCTION = `You are the Writing Assistant for "SHAHNOOR Writes", an independent literary journal rooted in quiet reflection, long-form essays, storytelling, memoir, and the cultural warmth of Kashmir.

Your role is to support the author while drafting and preparing pieces for publication: refining prose rhythm, checking grammar and punctuation without flattening the author's literary voice, and generating creative suggestions.

Voice & Style Guidelines:
- Preserve the author's own voice: warm, observant, unhurried, poetic without melodrama, intellectual without jargon.
- Avoid generic marketing clichés, hype, buzzwords, or robotic transitions.
- When producing prose or outlines meant for the manuscript, format cleanly using the publication's Markdown syntax:
  - ## for major section headings
  - ### for subheadings
  - > for blockquotes
  - >> for centered literary pull quotes
  - --- for Kashmiri manuscript dividers
- Keep conversational advice concise, clear, and immediately actionable.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/assistant', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const idToken = authHeader.slice('Bearer '.length).trim();
      if (!idToken) {
        res.status(401).json({ error: 'Missing authentication token.' });
        return;
      }

      try {
        await verifyFirebaseAdminToken(idToken);
      } catch (authErr) {
        res.status(403).json({
          error: authErr instanceof Error ? authErr.message : 'Unauthorized access.',
        });
        return;
      }

      const body = req.body as {
        mode?: AssistantMode;
        prompt?: string;
        draft?: DraftContext;
        history?: ChatTurn[];
      };

      const mode: AssistantMode = body.mode ?? 'chat';
      const userPrompt = (body.prompt ?? '').trim().slice(0, 4000);
      const draftSnapshot = buildDraftSnapshot(body.draft);
      const hasSelection = Boolean(body.draft?.selectedText?.trim());
      const ai = getGeminiClient();

      if (mode === 'metadata') {
        const metadataPrompt = `Review the manuscript below and generate publishing-ready editorial metadata for SHAHNOOR Writes.

${draftSnapshot}

${userPrompt ? `Author's specific note: ${userPrompt}` : ''}

Produce:
1. Three evocative, literary title options (concise, memorable, never clickbait).
2. One poetic subtitle/deck (1 short sentence).
3. A two-sentence literary excerpt suitable for the homepage and archive.
4. A clean SEO title (under 65 characters).
5. A compelling SEO meta description (under 155 characters).
6. 3 to 5 concise thematic tags (1-2 words each).`;

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: metadataPrompt,
          config: {
            systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Three evocative literary headline options.',
                },
                subtitle: {
                  type: Type.STRING,
                  description: 'A refined editorial subtitle/deck.',
                },
                excerpt: {
                  type: Type.STRING,
                  description: 'Two-sentence literary summary for cards and archive.',
                },
                seoTitle: {
                  type: Type.STRING,
                  description: 'Search engine title under 65 characters.',
                },
                seoDescription: {
                  type: Type.STRING,
                  description: 'Search engine meta description under 155 characters.',
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 to 5 concise thematic tags.',
                },
              },
              required: [
                'titleSuggestions',
                'subtitle',
                'excerpt',
                'seoTitle',
                'seoDescription',
                'tags',
              ],
            },
          },
        });

        const rawJson = (response.text ?? '{}').trim();
        const parsed = JSON.parse(rawJson);
        res.json({ mode: 'metadata', metadata: parsed });
        return;
      }

      if (mode === 'grammar') {
        const targetScope = hasSelection
          ? 'the Highlighted Passage Selected by Author'
          : 'the Manuscript Body';
        const grammarPrompt = `Carefully proofread ${targetScope} below for grammar, spelling, punctuation, subject-verb agreement, tense consistency, and awkward syntax, while preserving intentional poetic/literary cadence and Markdown syntax (##, >, >>, ---).

${draftSnapshot}

${userPrompt ? `Author's note: ${userPrompt}` : ''}

Return:
1. summary: A brief 1-2 sentence overview of the grammar and mechanics check.
2. issues: Up to 8 specific corrections found (if the text is already clean, return an empty array).
3. correctedText: The complete proofread text of ${targetScope} with all fixes cleanly applied.`;

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: grammarPrompt,
          config: {
            systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: 'Brief overview of grammar & style findings.',
                },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: { type: Type.STRING },
                      suggestion: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['original', 'suggestion', 'reason'],
                  },
                  description: 'List of grammar, spelling, or punctuation fixes.',
                },
                correctedText: {
                  type: Type.STRING,
                  description: 'The full proofread target text with fixes applied.',
                },
              },
              required: ['summary', 'issues', 'correctedText'],
            },
          },
        });

        const rawJson = (response.text ?? '{}').trim();
        const parsed = JSON.parse(rawJson);
        res.json({ mode: 'grammar', grammar: parsed });
        return;
      }

      if (mode === 'suggestions') {
        const suggestionsPrompt = `Generate thoughtful, creative literary suggestions tailored to this draft on SHAHNOOR Writes. Avoid clichés and honor the mood of the manuscript.

${draftSnapshot}

${userPrompt ? `Author's creative direction: ${userPrompt}` : ''}

Produce:
1. openingHooks: 2 evocative opening sentences or scene-setting angles.
2. imageryAndMotifs: 3 sensory imagery ideas, metaphors, or atmospheric details suited to this piece.
3. structuralAngles: 2 creative ways to deepen the narrative arc, contrast, or closing reflection.
4. pullQuotes: 2 memorable literary pull-quote lines formatted cleanly (each starting with ">> ").`;

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: suggestionsPrompt,
          config: {
            systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                openingHooks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                imageryAndMotifs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                structuralAngles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                pullQuotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'openingHooks',
                'imageryAndMotifs',
                'structuralAngles',
                'pullQuotes',
              ],
            },
          },
        });

        const rawJson = (response.text ?? '{}').trim();
        const parsed = JSON.parse(rawJson);
        res.json({ mode: 'suggestions', suggestions: parsed });
        return;
      }

      let taskPrompt = '';
      switch (mode) {
        case 'outline':
          taskPrompt = `Craft a structured literary outline for this piece using ## section headings and brief notes on arc, imagery, and pacing. Keep it deeply true to the subject.

${draftSnapshot}

${userPrompt ? `Focus or idea from the author: ${userPrompt}` : ''}`;
          break;

        case 'refine':
          taskPrompt = `Offer a polished, line-edited revision of ${
            hasSelection ? 'the Highlighted Passage Selected by Author' : 'the current manuscript draft'
          } preserving the author's personal voice, cadence, and imagery while elevating clarity and rhythm. Return ONLY the refined Markdown prose so the author can apply it directly.

${draftSnapshot}

${userPrompt ? `Author's request: ${userPrompt}` : ''}`;
          break;

        case 'continue':
          taskPrompt = `Continue the manuscript naturally from where it leaves off, writing 2 to 3 cohesive literary paragraphs that match the tone, pacing, and sensory imagery already established. Provide only the continuation prose so the author can insert it directly.

${draftSnapshot}

${userPrompt ? `Direction for what comes next: ${userPrompt}` : ''}`;
          break;

        case 'review':
          taskPrompt = `Perform a pre-publication editorial review of this manuscript before it goes live on SHAHNOOR Writes. Evaluate:
- Opening hook & drop-cap readiness
- Structural flow and section pacing (suggest ## headings or --- breaks if long paragraphs feel dense)
- Clarity, emotional resonance, and closing line impact
- A quick readiness verdict (Ready to Publish / Minor Polish Suggested)

${draftSnapshot}

${userPrompt ? `Author's question: ${userPrompt}` : ''}`;
          break;

        case 'chat':
        default: {
          const historyText = Array.isArray(body.history)
            ? body.history
                .slice(-8)
                .map((h) => `${h.role === 'user' ? 'Author' : 'Companion'}: ${String(h.text).slice(0, 1500)}`)
                .join('\n\n')
            : '';

          taskPrompt = `Current Manuscript Context:
${draftSnapshot}

${historyText ? `Recent Conversation:\n${historyText}\n\n` : ''}Author's Message:
${userPrompt || 'Help me think through the next step for this piece.'}`;
          break;
        }
      }

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: taskPrompt,
        config: {
          systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
        },
      });

      res.json({
        mode,
        text: response.text ?? '',
      });
    } catch (error) {
      console.error('Editorial assistant error:', error);
      const message =
        error instanceof Error ? error.message : 'Unable to reach the Editorial Companion.';
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SHAHNOOR Writes server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
