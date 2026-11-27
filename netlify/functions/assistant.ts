import { GoogleGenAI, Type } from '@google/genai';
import firebaseConfig from '../../firebase-applet-config.json';

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

async function verifyFirebaseAdminToken(idToken: string): Promise<void> {
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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    if (!idToken) {
      return jsonResponse({ error: 'Missing authentication token.' }, 401);
    }

    try {
      await verifyFirebaseAdminToken(idToken);
    } catch (authErr) {
      return jsonResponse(
        { error: authErr instanceof Error ? authErr.message : 'Unauthorized access.' },
        403,
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        { error: 'GEMINI_API_KEY is not configured in Netlify environment variables.' },
        500,
      );
    }

    const body = (await req.json()) as {
      mode?: AssistantMode;
      prompt?: string;
      draft?: DraftContext;
      history?: ChatTurn[];
    };

    const mode: AssistantMode = body.mode ?? 'chat';
    const userPrompt = (body.prompt ?? '').trim().slice(0, 4000);
    const draftSnapshot = buildDraftSnapshot(body.draft);
    const hasSelection = Boolean(body.draft?.selectedText?.trim());

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

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
              titleSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              subtitle: { type: Type.STRING },
              excerpt: { type: Type.STRING },
              seoTitle: { type: Type.STRING },
              seoDescription: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
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

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return jsonResponse({ mode: 'metadata', metadata: parsed });
    }

    if (mode === 'grammar') {
      const targetScope = hasSelection
        ? 'the Highlighted Passage Selected by Author'
        : 'the Manuscript Body';
      const grammarPrompt = `Carefully proofread ${targetScope} below for grammar, spelling, punctuation, subject-verb agreement, tense consistency, and awkward syntax, while preserving intentional poetic/literary cadence and Markdown syntax (##, >, >>, ---).

${draftSnapshot}

${userPrompt ? `Author's note: ${userPrompt}` : ''}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: grammarPrompt,
        config: {
          systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
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
              },
              correctedText: { type: Type.STRING },
            },
            required: ['summary', 'issues', 'correctedText'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return jsonResponse({ mode: 'grammar', grammar: parsed });
    }

    if (mode === 'suggestions') {
      const suggestionsPrompt = `Generate thoughtful, creative literary suggestions tailored to this draft on SHAHNOOR Writes. Avoid clichés and honor the mood of the manuscript.

${draftSnapshot}

${userPrompt ? `Author's creative direction: ${userPrompt}` : ''}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: suggestionsPrompt,
        config: {
          systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              openingHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
              imageryAndMotifs: { type: Type.ARRAY, items: { type: Type.STRING } },
              structuralAngles: { type: Type.ARRAY, items: { type: Type.STRING } },
              pullQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },
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

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return jsonResponse({ mode: 'suggestions', suggestions: parsed });
    }

    let taskPrompt = '';
    switch (mode) {
      case 'outline':
        taskPrompt = `Craft a structured literary outline for this piece using ## section headings and brief notes on arc, imagery, and pacing.\n\n${draftSnapshot}\n\n${userPrompt}`;
        break;
      case 'refine':
        taskPrompt = `Offer a polished, line-edited revision of ${
          hasSelection ? 'the Highlighted Passage Selected by Author' : 'the current manuscript draft'
        } preserving the author's personal voice, cadence, and imagery. Return ONLY the refined Markdown prose.\n\n${draftSnapshot}\n\n${userPrompt}`;
        break;
      case 'continue':
        taskPrompt = `Continue the manuscript naturally with 2 to 3 cohesive literary paragraphs matching the established tone.\n\n${draftSnapshot}\n\n${userPrompt}`;
        break;
      case 'review':
        taskPrompt = `Perform a pre-publication editorial review of this manuscript for SHAHNOOR Writes.\n\n${draftSnapshot}\n\n${userPrompt}`;
        break;
      case 'chat':
      default: {
        const historyText = Array.isArray(body.history)
          ? body.history
              .slice(-8)
              .map((h) => `${h.role === 'user' ? 'Author' : 'Assistant'}: ${String(h.text).slice(0, 1500)}`)
              .join('\n\n')
          : '';
        taskPrompt = `Current Manuscript Context:\n${draftSnapshot}\n\n${
          historyText ? `Recent Conversation:\n${historyText}\n\n` : ''
        }Author's Message:\n${userPrompt || 'Help me think through the next step for this piece.'}`;
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

    return jsonResponse({ mode, text: response.text ?? '' });
  } catch (error) {
    console.error('Netlify assistant error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unable to reach Writing Assistant.' },
      502,
    );
  }
}
