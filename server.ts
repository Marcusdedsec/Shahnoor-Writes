import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { signSessionToken, verifySessionToken } from './server/auth.ts';
import {
  type DbUser,
  addContactMessageRecord,
  addReflectionRecord,
  addSubscriberRecord,
  authenticateUser,
  createAuthorUserOnce,
  createReaderUser,
  deleteArticleRecord,
  deleteCategoryRecord,
  deleteMessageRecord,
  deleteReflectionRecord,
  deleteThoughtRecord,
  getArticleById,
  getAuthorConfig,
  getUserById,
  listAllArticles,
  listCategories,
  listMessages,
  listPublishedArticles,
  listReflections,
  listSubscribers,
  listThoughts,
  saveThoughtRecord,
  updateMessageStatusRecord,
  updateUserProfileRecord,
  upsertArticle,
  upsertCategory,
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = 'gemini-4-hydrogen';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthenticatedRequest extends Request {
  authUser?: DbUser;
}

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

function extractBearerUser(req: Request): DbUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  const claims = verifySessionToken(token);
  if (!claims) return null;
  return getUserById(claims.uid);
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = extractBearerUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireAuthor(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = extractBearerUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  if (user.role !== 'author') {
    res.status(403).json({ error: 'Only the publication author may perform this action.' });
    return;
  }
  req.authUser = user;
  next();
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

  // Bootstrap public + role-scoped editorial data
  app.get('/api/bootstrap', (req: Request, res: Response) => {
    const user = extractBearerUser(req);
    const authorConfig = getAuthorConfig();
    const publishedArticles = listPublishedArticles();
    const categories = listCategories();
    const thoughts = listThoughts();

    const payload: Record<string, unknown> = {
      user,
      authorConfig,
      publishedArticles,
      categories,
      thoughts,
    };

    if (user?.role === 'author') {
      payload.allArticles = listAllArticles();
      payload.subscribers = listSubscribers();
      payload.messages = listMessages();
    }

    res.json(payload);
  });

  // Reader Join (Name + Email + Password)
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    try {
      const body = req.body as {
        name?: string;
        email?: string;
        password?: string;
        bio?: string;
      };
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const bio = String(body.bio ?? '').trim();

      if (!name || name.length > 80) {
        res.status(400).json({ error: 'Please enter your name (up to 80 characters).' });
        return;
      }
      if (!EMAIL_REGEX.test(email) || email.length > 160) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }

      const user = createReaderUser({ name, email, password, bio });
      const token = signSessionToken(user.id, user.role);
      res.status(201).json({ token, user });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to create your account.',
      });
    }
  });

  // First-run Author Profile setup (Name + Email + Password)
  app.post('/api/auth/author-setup', (req: Request, res: Response) => {
    try {
      const body = req.body as {
        name?: string;
        email?: string;
        password?: string;
      };
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');

      if (!name || name.length > 80) {
        res.status(400).json({ error: 'Please enter your author name (up to 80 characters).' });
        return;
      }
      if (!EMAIL_REGEX.test(email) || email.length > 160) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }

      const user = createAuthorUserOnce({ name, email, password });
      const token = signSessionToken(user.id, user.role);
      res.status(201).json({ token, user });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create author profile.';
      const status = msg.includes('already exists') ? 409 : 400;
      res.status(status).json({ error: msg });
    }
  });

  // Email + Password Sign In (Readers and Author)
  app.post('/api/auth/signin', (req: Request, res: Response) => {
    const body = req.body as { email?: string; password?: string };
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!EMAIL_REGEX.test(email) || !password) {
      res.status(400).json({ error: 'Please enter your email and password.' });
      return;
    }

    const user = authenticateUser(email, password);
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password. Please check your details and try again.' });
      return;
    }

    const token = signSessionToken(user.id, user.role);
    res.json({ token, user });
  });

  // Update signed-in user's public display profile
  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as { name?: string; bio?: string };
    const name = String(body.name ?? '').trim();
    const bio = String(body.bio ?? '').trim();
    if (!name || name.length > 80) {
      res.status(400).json({ error: 'Display name cannot be empty.' });
      return;
    }
    const updated = updateUserProfileRecord(req.authUser!.id, name, bio);
    res.json({ user: updated });
  });

  // Articles (Author only)
  app.post('/api/articles', requireAuthor, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as {
      id?: string;
      slug?: string;
      title?: string;
      subtitle?: string;
      excerpt?: string;
      content?: string;
      coverImage?: string;
      coverCaption?: string;
      category?: string;
      tags?: string[];
      status?: 'draft' | 'published' | 'scheduled';
      featured?: boolean;
      authorName?: string;
      readingTimeMinutes?: number;
      seoTitle?: string;
      seoDescription?: string;
      publishDate?: string;
    };

    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '');
    if (!title || !content.trim()) {
      res.status(400).json({ error: 'Please include both a title and manuscript content.' });
      return;
    }

    const status =
      body.status === 'published' || body.status === 'scheduled' ? body.status : 'draft';
    const publishDate = String(body.publishDate || new Date().toISOString().slice(0, 10)).slice(
      0,
      40,
    );
    const parsedDate = new Date(
      publishDate.includes('T') ? publishDate : `${publishDate}T08:00:00`,
    );
    const publishAtMillis = Number.isNaN(parsedDate.getTime())
      ? Date.now()
      : parsedDate.getTime();

    const article = upsertArticle(req.authUser!.id, {
      id: body.id,
      slug: String(body.slug || title),
      title,
      subtitle: String(body.subtitle ?? ''),
      excerpt: String(body.excerpt ?? ''),
      content,
      coverImage: String(body.coverImage ?? ''),
      coverCaption: String(body.coverCaption ?? ''),
      category: String(body.category ?? 'Essays'),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      status,
      featured: Boolean(body.featured),
      authorName: String(body.authorName || req.authUser!.name || 'Shahnoor'),
      readingTimeMinutes: Number(body.readingTimeMinutes ?? 5),
      seoTitle: String(body.seoTitle ?? ''),
      seoDescription: String(body.seoDescription ?? ''),
      publishDate,
      publishAtMillis,
    });

    res.json({ article });
  });

  app.delete('/api/articles/:id', requireAuthor, (req: AuthenticatedRequest, res: Response) => {
    deleteArticleRecord(String(req.params.id));
    res.json({ ok: true });
  });

  // Categories (Author only)
  app.post('/api/categories', requireAuthor, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as { name?: string; description?: string; accent?: string };
    const name = String(body.name ?? '').trim();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    if (!name || !slug) {
      res.status(400).json({ error: 'Please provide a valid category name.' });
      return;
    }

    const category = upsertCategory({
      name,
      slug,
      description: String(body.description ?? ''),
      accent: String(body.accent ?? '#9C443B'),
    });
    res.status(201).json({ category });
  });

  app.delete('/api/categories/:id', requireAuthor, (req: AuthenticatedRequest, res: Response) => {
    deleteCategoryRecord(String(req.params.id));
    res.json({ ok: true });
  });

  // Community Thoughts (Any signed-in reader or author; edit/delete enforced by ownership)
  app.post('/api/thoughts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as { id?: string; title?: string; body?: string; theme?: string };
      const title = String(body.title ?? '').trim();
      const text = String(body.body ?? '').trim();
      const theme = String(body.theme ?? 'Reflection').trim() || 'Reflection';

      if (!title || !text) {
        res.status(400).json({ error: 'Please include both a title and your reflection.' });
        return;
      }

      const thought = saveThoughtRecord(req.authUser!, {
        id: body.id ? String(body.id) : undefined,
        title,
        body: text,
        theme,
      });
      res.status(201).json({ thought });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Unable to save thought.',
      });
    }
  });

  app.delete('/api/thoughts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      deleteThoughtRecord(req.authUser!, String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Unable to delete thought.',
      });
    }
  });

  // Article Reflections
  app.get('/api/articles/:articleId/reflections', (req: Request, res: Response) => {
    const articleId = String(req.params.articleId);
    const user = extractBearerUser(req);
    const article = getArticleById(articleId);
    if (!article) {
      res.json({ reflections: [] });
      return;
    }
    if (article.status !== 'published' && user?.role !== 'author') {
      res.status(403).json({ error: 'Reflections are only visible for published articles.' });
      return;
    }
    res.json({ reflections: listReflections(articleId) });
  });

  app.post(
    '/api/articles/:articleId/reflections',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const articleId = String(req.params.articleId);
        const body = String((req.body as { body?: string }).body ?? '').trim();
        if (!body) {
          res.status(400).json({ error: 'Please write a brief reflection before posting.' });
          return;
        }
        const reflection = addReflectionRecord(req.authUser!, articleId, body);
        res.status(201).json({ reflection });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Unable to post reflection.',
        });
      }
    },
  );

  app.delete(
    '/api/articles/:articleId/reflections/:reflectionId',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        deleteReflectionRecord(
          req.authUser!,
          String(req.params.articleId),
          String(req.params.reflectionId),
        );
        res.json({ ok: true });
      } catch (err) {
        res.status(403).json({
          error: err instanceof Error ? err.message : 'Unable to remove reflection.',
        });
      }
    },
  );

  // Newsletter Subscribers & Contact Letters
  app.post('/api/subscribers', (req: Request, res: Response) => {
    const email = String((req.body as { email?: string }).email ?? '')
      .trim()
      .toLowerCase();
    if (!EMAIL_REGEX.test(email) || email.length > 160) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    addSubscriberRecord(email);
    res.status(201).json({ ok: true });
  });

  app.post('/api/messages', (req: Request, res: Response) => {
    const body = req.body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();

    if (!name || !subject || !message) {
      res.status(400).json({ error: 'Please complete all fields before sending your letter.' });
      return;
    }
    if (!EMAIL_REGEX.test(email) || email.length > 160) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    addContactMessageRecord({ name, email, subject, message });
    res.status(201).json({ ok: true });
  });

  app.patch('/api/messages/:id', requireAuthor, (req: AuthenticatedRequest, res: Response) => {
    const status = (req.body as { status?: string }).status;
    if (status !== 'unread' && status !== 'read' && status !== 'archived') {
      res.status(400).json({ error: 'Invalid status value.' });
      return;
    }
    updateMessageStatusRecord(String(req.params.id), status);
    res.json({ ok: true });
  });

  app.delete('/api/messages/:id', requireAuthor, (req: AuthenticatedRequest, res: Response) => {
    deleteMessageRecord(String(req.params.id));
    res.json({ ok: true });
  });

  // AI Writing Assistant (Author only)
  app.post('/api/assistant', requireAuthor, async (req: AuthenticatedRequest, res: Response) => {
    try {
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
        error instanceof Error ? error.message : 'Unable to reach the Writing Assistant.';
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
