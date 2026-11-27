import crypto from 'node:crypto';
import fs from 'node:fs';
import { getStore } from '@netlify/blobs';
import { GoogleGenAI, Type } from '@google/genai';

const MODEL_NAME = 'gemini-4-hydrogen';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOCAL_FALLBACK_FILE = '/tmp/shahnoor-netlify-state.json';
const LOCAL_SECRET_FILE = '/tmp/shahnoor-netlify-secret.txt';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'reader' | 'author';
  bio: string;
  createdAtMillis: number;
  updatedAtMillis: number;
}

interface PublicUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  role: 'reader' | 'author';
  createdAtMillis: number;
  updatedAtMillis: number;
}

interface StoredArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverCaption: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  featured: boolean;
  isSample: boolean;
  authorName: string;
  authorId: string;
  readingTimeMinutes: number;
  seoTitle: string;
  seoDescription: string;
  publishDate: string;
  publishAtMillis: number;
  createdAtMillis: number;
  updatedAtMillis: number;
}

interface StoredCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
}

interface StoredThought {
  id: string;
  title: string;
  body: string;
  theme: string;
  authorName: string;
  authorId: string;
  createdAtMillis: number;
  updatedAtMillis: number;
}

interface StoredReflection {
  id: string;
  articleId: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAtMillis: number;
  updatedAtMillis: number;
}

interface StoredSubscriber {
  id: string;
  email: string;
  createdAtMillis: number;
}

interface StoredMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAtMillis: number;
}

interface AppState {
  users: StoredUser[];
  articles: StoredArticle[];
  categories: StoredCategory[];
  thoughts: StoredThought[];
  reflections: StoredReflection[];
  subscribers: StoredSubscriber[];
  messages: StoredMessage[];
}

interface SessionClaims {
  uid: string;
  role: 'reader' | 'author';
  iat: number;
  exp: number;
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

function emptyState(): AppState {
  return {
    users: [],
    articles: [],
    categories: [],
    thoughts: [],
    reflections: [],
    subscribers: [],
    messages: [],
  };
}

function toPublicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    bio: u.bio,
    role: u.role,
    createdAtMillis: u.createdAtMillis,
    updatedAtMillis: u.updatedAtMillis,
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function getBlobStoreSafe() {
  try {
    return getStore('shahnoor-writes');
  } catch {
    return null;
  }
}

async function getSessionSecret(): Promise<string> {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }

  const store = getBlobStoreSafe();
  if (store) {
    const existing = await store.get('session-secret', { type: 'text' });
    if (existing && existing.length >= 32) return existing;
    const generated = crypto.randomBytes(32).toString('hex');
    await store.set('session-secret', generated, { onlyIfNew: true });
    const persisted = await store.get('session-secret', { type: 'text' });
    return persisted || generated;
  }

  if (fs.existsSync(LOCAL_SECRET_FILE)) {
    const local = fs.readFileSync(LOCAL_SECRET_FILE, 'utf-8').trim();
    if (local.length >= 32) return local;
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(LOCAL_SECRET_FILE, generated, 'utf-8');
  return generated;
}

async function signSessionToken(uid: string, role: 'reader' | 'author'): Promise<string> {
  const secret = await getSessionSecret();
  const now = Date.now();
  const payload: SessionClaims = { uid, role, iat: now, exp: now + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  try {
    const secret = await getSessionSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig, 'utf-8');
    const expectedBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as Partial<SessionClaims>;
    if (
      typeof claims.uid !== 'string' ||
      (claims.role !== 'reader' && claims.role !== 'author') ||
      typeof claims.exp !== 'number' ||
      claims.exp <= Date.now()
    ) {
      return null;
    }

    return {
      uid: claims.uid,
      role: claims.role,
      iat: Number(claims.iat ?? 0),
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}

async function readState(): Promise<{ state: AppState; etag: string | null }> {
  const store = getBlobStoreSafe();
  if (store) {
    const res = await store.getWithMetadata('state', { type: 'json' });
    if (!res || !res.data) {
      return { state: emptyState(), etag: null };
    }
    const raw = res.data as Partial<AppState>;
    return {
      state: {
        users: Array.isArray(raw.users) ? raw.users : [],
        articles: Array.isArray(raw.articles) ? raw.articles : [],
        categories: Array.isArray(raw.categories) ? raw.categories : [],
        thoughts: Array.isArray(raw.thoughts) ? raw.thoughts : [],
        reflections: Array.isArray(raw.reflections) ? raw.reflections : [],
        subscribers: Array.isArray(raw.subscribers) ? raw.subscribers : [],
        messages: Array.isArray(raw.messages) ? raw.messages : [],
      },
      etag: res.etag ?? null,
    };
  }

  if (!fs.existsSync(LOCAL_FALLBACK_FILE)) {
    return { state: emptyState(), etag: null };
  }
  const raw = JSON.parse(fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf-8')) as Partial<AppState>;
  return {
    state: {
      users: Array.isArray(raw.users) ? raw.users : [],
      articles: Array.isArray(raw.articles) ? raw.articles : [],
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      thoughts: Array.isArray(raw.thoughts) ? raw.thoughts : [],
      reflections: Array.isArray(raw.reflections) ? raw.reflections : [],
      subscribers: Array.isArray(raw.subscribers) ? raw.subscribers : [],
      messages: Array.isArray(raw.messages) ? raw.messages : [],
    },
    etag: null,
  };
}

async function mutateState<T>(mutator: (state: AppState) => T): Promise<T> {
  const store = getBlobStoreSafe();
  if (!store) {
    const { state } = await readState();
    const result = mutator(state);
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(state), 'utf-8');
    return result;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, etag } = await readState();
    const result = mutator(state);
    const writeRes = await store.setJSON(
      'state',
      state,
      etag ? { onlyIfMatch: etag } : { onlyIfNew: true },
    );
    if (writeRes.modified) {
      return result;
    }
  }
  throw new Error('Concurrent update conflict. Please retry.');
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function extractBearerUser(req: Request, state: AppState): Promise<StoredUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  return state.users.find((u) => u.id === claims.uid) ?? null;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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

async function handleAssistant(req: Request, user: StoredUser): Promise<Response> {
  if (user.role !== 'author') {
    return jsonResponse({ error: 'Only the publication author may use the Writing Assistant.' }, 403);
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
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  if (mode === 'metadata') {
    const metadataPrompt = `Review the manuscript below and generate publishing-ready editorial metadata for SHAHNOOR Writes.\n\n${draftSnapshot}\n\n${
      userPrompt ? `Author's specific note: ${userPrompt}` : ''
    }`;
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
          required: ['titleSuggestions', 'subtitle', 'excerpt', 'seoTitle', 'seoDescription', 'tags'],
        },
      },
    });
    return jsonResponse({ mode: 'metadata', metadata: JSON.parse((response.text ?? '{}').trim()) });
  }

  if (mode === 'grammar') {
    const targetScope = hasSelection
      ? 'the Highlighted Passage Selected by Author'
      : 'the Manuscript Body';
    const grammarPrompt = `Carefully proofread ${targetScope} below for grammar, spelling, punctuation, subject-verb agreement, tense consistency, and awkward syntax, while preserving intentional poetic/literary cadence and Markdown syntax (##, >, >>, ---).\n\n${draftSnapshot}\n\n${
      userPrompt ? `Author's note: ${userPrompt}` : ''
    }`;
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
    return jsonResponse({ mode: 'grammar', grammar: JSON.parse((response.text ?? '{}').trim()) });
  }

  if (mode === 'suggestions') {
    const suggestionsPrompt = `Generate thoughtful, creative literary suggestions tailored to this draft on SHAHNOOR Writes.\n\n${draftSnapshot}\n\n${
      userPrompt ? `Author's creative direction: ${userPrompt}` : ''
    }`;
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
          required: ['openingHooks', 'imageryAndMotifs', 'structuralAngles', 'pullQuotes'],
        },
      },
    });
    return jsonResponse({ mode: 'suggestions', suggestions: JSON.parse((response.text ?? '{}').trim()) });
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
            .map((h) => `${h.role === 'user' ? 'Author' : 'Companion'}: ${String(h.text).slice(0, 1500)}`)
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
    config: { systemInstruction: EDITORIAL_SYSTEM_INSTRUCTION },
  });

  return jsonResponse({ mode, text: response.text ?? '' });
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const apiPath =
      url.pathname.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '') || '/';
    const method = req.method.toUpperCase();

    if (method === 'GET' && apiPath === '/bootstrap') {
      const { state } = await readState();
      const user = await extractBearerUser(req, state);
      const author = state.users.find((u) => u.role === 'author');
      const now = Date.now();

      const publishedArticles = state.articles
        .filter(
          (a) =>
            a.status === 'published' || (a.status === 'scheduled' && a.publishAtMillis <= now),
        )
        .sort((a, b) => b.publishDate.localeCompare(a.publishDate));

      const thoughts = [...state.thoughts].sort((a, b) => b.createdAtMillis - a.createdAtMillis);

      const payload: Record<string, unknown> = {
        user: user ? toPublicUser(user) : null,
        authorConfig: author ? { displayName: author.name } : null,
        publishedArticles,
        categories: state.categories,
        thoughts,
      };

      if (user?.role === 'author') {
        payload.allArticles = [...state.articles].sort((a, b) =>
          b.publishDate.localeCompare(a.publishDate),
        );
        payload.subscribers = [...state.subscribers].sort(
          (a, b) => b.createdAtMillis - a.createdAtMillis,
        );
        payload.messages = [...state.messages].sort(
          (a, b) => b.createdAtMillis - a.createdAtMillis,
        );
      }

      return jsonResponse(payload);
    }

    if (method === 'POST' && apiPath === '/auth/signup') {
      const body = (await req.json()) as {
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
        return jsonResponse({ error: 'Please enter your name (up to 80 characters).' }, 400);
      }
      if (!EMAIL_REGEX.test(email) || email.length > 160) {
        return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
      }
      if (password.length < 6 || password.length > 128) {
        return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
      }

      const created = await mutateState((state) => {
        if (state.users.some((u) => u.email === email)) {
          throw new HttpError(400, 'An account with this email already exists. Please sign in instead.');
        }
        const now = Date.now();
        const user: StoredUser = {
          id: `usr_${crypto.randomUUID().replace(/-/g, '')}`,
          name: name.slice(0, 80),
          email,
          passwordHash: hashPassword(password),
          role: 'reader',
          bio: bio.slice(0, 300),
          createdAtMillis: now,
          updatedAtMillis: now,
        };
        state.users.push(user);
        return toPublicUser(user);
      });

      const token = await signSessionToken(created.id, created.role);
      return jsonResponse({ token, user: created }, 201);
    }

    if (method === 'POST' && apiPath === '/auth/author-setup') {
      const body = (await req.json()) as {
        name?: string;
        email?: string;
        password?: string;
      };
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');

      if (!name || name.length > 80) {
        return jsonResponse({ error: 'Please enter your author name (up to 80 characters).' }, 400);
      }
      if (!EMAIL_REGEX.test(email) || email.length > 160) {
        return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
      }
      if (password.length < 6 || password.length > 128) {
        return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
      }

      const created = await mutateState((state) => {
        if (state.users.some((u) => u.role === 'author')) {
          throw new HttpError(
            409,
            'An author profile already exists. Please sign in with your email and password.',
          );
        }
        if (state.users.some((u) => u.email === email)) {
          throw new HttpError(
            400,
            'This email is already used by a reader account. Please choose another email or sign in.',
          );
        }
        const now = Date.now();
        const user: StoredUser = {
          id: `usr_${crypto.randomUUID().replace(/-/g, '')}`,
          name: name.slice(0, 80),
          email,
          passwordHash: hashPassword(password),
          role: 'author',
          bio: '',
          createdAtMillis: now,
          updatedAtMillis: now,
        };
        state.users.push(user);
        return toPublicUser(user);
      });

      const token = await signSessionToken(created.id, created.role);
      return jsonResponse({ token, user: created }, 201);
    }

    if (method === 'POST' && apiPath === '/auth/signin') {
      const body = (await req.json()) as { email?: string; password?: string };
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');

      if (!EMAIL_REGEX.test(email) || !password) {
        return jsonResponse({ error: 'Please enter your email and password.' }, 400);
      }

      const { state } = await readState();
      const found = state.users.find((u) => u.email === email);
      if (!found || !verifyPassword(password, found.passwordHash)) {
        return jsonResponse(
          { error: 'Incorrect email or password. Please check your details and try again.' },
          401,
        );
      }

      const token = await signSessionToken(found.id, found.role);
      return jsonResponse({ token, user: toPublicUser(found) });
    }

    if (method === 'PATCH' && apiPath === '/auth/profile') {
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);

      const body = (await req.json()) as { name?: string; bio?: string };
      const name = String(body.name ?? '').trim();
      const bio = String(body.bio ?? '').trim();
      if (!name || name.length > 80) {
        return jsonResponse({ error: 'Display name cannot be empty.' }, 400);
      }

      const updated = await mutateState((s) => {
        const target = s.users.find((u) => u.id === authUser.id);
        if (!target) throw new HttpError(404, 'Account not found.');
        target.name = name.slice(0, 80);
        target.bio = bio.slice(0, 300);
        target.updatedAtMillis = Date.now();
        return toPublicUser(target);
      });
      return jsonResponse({ user: updated });
    }

    if (method === 'POST' && apiPath === '/articles') {
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);
      if (authUser.role !== 'author') {
        return jsonResponse({ error: 'Only the publication author may save articles.' }, 403);
      }

      const body = (await req.json()) as Record<string, unknown>;
      const title = String(body.title ?? '').trim();
      const content = String(body.content ?? '');
      if (!title || !content.trim()) {
        return jsonResponse({ error: 'Please include both a title and manuscript content.' }, 400);
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

      const saved = await mutateState((s) => {
        const now = Date.now();
        const rawSlug = String(body.slug || title)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 140);
        let finalSlug = rawSlug || `essay-${now}`;
        const existingId = typeof body.id === 'string' ? body.id : undefined;
        const conflict = s.articles.find((a) => a.slug === finalSlug && a.id !== existingId);
        if (conflict) {
          finalSlug = `${finalSlug.slice(0, 125)}-${Math.random().toString(36).slice(2, 7)}`;
        }

        const existing = existingId ? s.articles.find((a) => a.id === existingId) : undefined;
        const tags = Array.isArray(body.tags) ? body.tags.map(String).slice(0, 10) : [];

        if (existing) {
          Object.assign(existing, {
            slug: finalSlug,
            title: title.slice(0, 180),
            subtitle: String(body.subtitle ?? '').trim().slice(0, 280),
            excerpt: String(body.excerpt ?? '').trim().slice(0, 500),
            content: content.slice(0, 80000),
            coverImage: String(body.coverImage ?? '').slice(0, 350000),
            coverCaption: String(body.coverCaption ?? '').trim().slice(0, 300),
            category: String(body.category ?? 'Essays').trim().slice(0, 50) || 'Essays',
            tags,
            status,
            featured: Boolean(body.featured),
            authorName: String(body.authorName || authUser.name || 'Shahnoor').trim().slice(0, 80),
            readingTimeMinutes: Math.max(
              1,
              Math.min(180, Math.round(Number(body.readingTimeMinutes ?? 5))),
            ),
            seoTitle: String(body.seoTitle ?? '').trim().slice(0, 180),
            seoDescription: String(body.seoDescription ?? '').trim().slice(0, 320),
            publishDate,
            publishAtMillis,
            updatedAtMillis: now,
          });
          return existing;
        }

        const article: StoredArticle = {
          id: `art_${crypto.randomUUID().replace(/-/g, '')}`,
          slug: finalSlug,
          title: title.slice(0, 180),
          subtitle: String(body.subtitle ?? '').trim().slice(0, 280),
          excerpt: String(body.excerpt ?? '').trim().slice(0, 500),
          content: content.slice(0, 80000),
          coverImage: String(body.coverImage ?? '').slice(0, 350000),
          coverCaption: String(body.coverCaption ?? '').trim().slice(0, 300),
          category: String(body.category ?? 'Essays').trim().slice(0, 50) || 'Essays',
          tags,
          status,
          featured: Boolean(body.featured),
          isSample: false,
          authorName: String(body.authorName || authUser.name || 'Shahnoor').trim().slice(0, 80),
          authorId: authUser.id,
          readingTimeMinutes: Math.max(
            1,
            Math.min(180, Math.round(Number(body.readingTimeMinutes ?? 5))),
          ),
          seoTitle: String(body.seoTitle ?? '').trim().slice(0, 180),
          seoDescription: String(body.seoDescription ?? '').trim().slice(0, 320),
          publishDate,
          publishAtMillis,
          createdAtMillis: now,
          updatedAtMillis: now,
        };
        s.articles.push(article);
        return article;
      });

      return jsonResponse({ article: saved });
    }

    const articleDeleteMatch = apiPath.match(/^\/articles\/([^/]+)$/);
    if (method === 'DELETE' && articleDeleteMatch) {
      const id = decodeURIComponent(articleDeleteMatch[1]);
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);
      if (authUser.role !== 'author') {
        return jsonResponse({ error: 'Author access required.' }, 403);
      }

      await mutateState((s) => {
        s.articles = s.articles.filter((a) => a.id !== id);
        s.reflections = s.reflections.filter((r) => r.articleId !== id);
      });
      return jsonResponse({ ok: true });
    }

    if (method === 'POST' && apiPath === '/categories') {
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);
      if (authUser.role !== 'author') return jsonResponse({ error: 'Author access required.' }, 403);

      const body = (await req.json()) as { name?: string; description?: string; accent?: string };
      const name = String(body.name ?? '').trim();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
      if (!name || !slug) {
        return jsonResponse({ error: 'Please provide a valid category name.' }, 400);
      }

      const category = await mutateState((s) => {
        const next: StoredCategory = {
          id: slug,
          name: name.slice(0, 50),
          slug,
          description: String(body.description ?? '').trim().slice(0, 300),
          accent: String(body.accent ?? '#9C443B').slice(0, 30),
        };
        const idx = s.categories.findIndex((c) => c.slug === slug);
        if (idx >= 0) s.categories[idx] = next;
        else s.categories.push(next);
        return next;
      });
      return jsonResponse({ category }, 201);
    }

    const catDeleteMatch = apiPath.match(/^\/categories\/([^/]+)$/);
    if (method === 'DELETE' && catDeleteMatch) {
      const id = decodeURIComponent(catDeleteMatch[1]);
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);
      if (authUser.role !== 'author') return jsonResponse({ error: 'Author access required.' }, 403);

      await mutateState((s) => {
        s.categories = s.categories.filter((c) => c.id !== id && c.slug !== id);
      });
      return jsonResponse({ ok: true });
    }

    if (method === 'POST' && apiPath === '/thoughts') {
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to share a thought.' }, 401);

      const body = (await req.json()) as { id?: string; title?: string; body?: string; theme?: string };
      const title = String(body.title ?? '').trim().slice(0, 140);
      const text = String(body.body ?? '').trim().slice(0, 8000);
      const theme = String(body.theme ?? 'Reflection').trim().slice(0, 40) || 'Reflection';
      if (!title || !text) {
        return jsonResponse({ error: 'Please include both a title and your reflection.' }, 400);
      }

      const thought = await mutateState((s) => {
        const now = Date.now();
        if (body.id) {
          const existing = s.thoughts.find((t) => t.id === body.id);
          if (!existing) throw new HttpError(404, 'Thought not found.');
          if (existing.authorId !== authUser.id && authUser.role !== 'author') {
            throw new HttpError(403, 'You may only edit your own thoughts.');
          }
          existing.title = title;
          existing.body = text;
          existing.theme = theme;
          existing.authorName = authUser.name;
          existing.updatedAtMillis = now;
          return existing;
        }

        const next: StoredThought = {
          id: `tht_${crypto.randomUUID().replace(/-/g, '')}`,
          title,
          body: text,
          theme,
          authorName: authUser.name,
          authorId: authUser.id,
          createdAtMillis: now,
          updatedAtMillis: now,
        };
        s.thoughts.push(next);
        return next;
      });
      return jsonResponse({ thought }, 201);
    }

    const thoughtDeleteMatch = apiPath.match(/^\/thoughts\/([^/]+)$/);
    if (method === 'DELETE' && thoughtDeleteMatch) {
      const id = decodeURIComponent(thoughtDeleteMatch[1]);
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);

      await mutateState((s) => {
        const existing = s.thoughts.find((t) => t.id === id);
        if (!existing) return;
        if (existing.authorId !== authUser.id && authUser.role !== 'author') {
          throw new HttpError(403, 'You may only remove your own thoughts.');
        }
        s.thoughts = s.thoughts.filter((t) => t.id !== id);
      });
      return jsonResponse({ ok: true });
    }

    const reflectionsRouteMatch = apiPath.match(/^\/articles\/([^/]+)\/reflections$/);
    if (reflectionsRouteMatch && method === 'GET') {
      const articleId = decodeURIComponent(reflectionsRouteMatch[1]);
      const { state } = await readState();
      const user = await extractBearerUser(req, state);
      const article = state.articles.find((a) => a.id === articleId);
      if (!article) return jsonResponse({ reflections: [] });
      if (article.status !== 'published' && user?.role !== 'author') {
        return jsonResponse({ error: 'Reflections are only visible for published articles.' }, 403);
      }
      const reflections = state.reflections
        .filter((r) => r.articleId === articleId)
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      return jsonResponse({ reflections });
    }

    if (reflectionsRouteMatch && method === 'POST') {
      const articleId = decodeURIComponent(reflectionsRouteMatch[1]);
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to leave a reflection.' }, 401);

      const body = String(((await req.json()) as { body?: string }).body ?? '')
        .trim()
        .slice(0, 2000);
      if (!body) {
        return jsonResponse({ error: 'Please write a brief reflection before posting.' }, 400);
      }

      const reflection = await mutateState((s) => {
        const article = s.articles.find((a) => a.id === articleId);
        if (!article || (article.status !== 'published' && authUser.role !== 'author')) {
          throw new HttpError(400, 'Reflections can only be posted on published essays.');
        }
        const now = Date.now();
        const next: StoredReflection = {
          id: `ref_${crypto.randomUUID().replace(/-/g, '')}`,
          articleId,
          body,
          authorName: authUser.name,
          authorId: authUser.id,
          createdAtMillis: now,
          updatedAtMillis: now,
        };
        s.reflections.push(next);
        return next;
      });
      return jsonResponse({ reflection }, 201);
    }

    const reflectionDeleteMatch = apiPath.match(/^\/articles\/([^/]+)\/reflections\/([^/]+)$/);
    if (reflectionDeleteMatch && method === 'DELETE') {
      const articleId = decodeURIComponent(reflectionDeleteMatch[1]);
      const reflectionId = decodeURIComponent(reflectionDeleteMatch[2]);
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in first.' }, 401);

      await mutateState((s) => {
        const existing = s.reflections.find(
          (r) => r.id === reflectionId && r.articleId === articleId,
        );
        if (!existing) return;
        if (existing.authorId !== authUser.id && authUser.role !== 'author') {
          throw new HttpError(403, 'You may only remove your own reflections.');
        }
        s.reflections = s.reflections.filter(
          (r) => !(r.id === reflectionId && r.articleId === articleId),
        );
      });
      return jsonResponse({ ok: true });
    }

    if (method === 'POST' && apiPath === '/subscribers') {
      const email = String(((await req.json()) as { email?: string }).email ?? '')
        .trim()
        .toLowerCase()
        .slice(0, 160);
      if (!EMAIL_REGEX.test(email)) {
        return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
      }

      await mutateState((s) => {
        if (!s.subscribers.some((sub) => sub.email === email)) {
          s.subscribers.push({
            id: `sub_${crypto.randomUUID().replace(/-/g, '')}`,
            email,
            createdAtMillis: Date.now(),
          });
        }
      });
      return jsonResponse({ ok: true }, 201);
    }

    if (method === 'POST' && apiPath === '/messages') {
      const body = (await req.json()) as {
        name?: string;
        email?: string;
        subject?: string;
        message?: string;
      };
      const name = String(body.name ?? '').trim().slice(0, 100);
      const email = String(body.email ?? '').trim().toLowerCase().slice(0, 160);
      const subject = String(body.subject ?? '').trim().slice(0, 180);
      const message = String(body.message ?? '').trim().slice(0, 5000);
      if (!name || !subject || !message) {
        return jsonResponse({ error: 'Please complete all fields before sending your letter.' }, 400);
      }
      if (!EMAIL_REGEX.test(email)) {
        return jsonResponse({ error: 'Please provide a valid email address.' }, 400);
      }

      await mutateState((s) => {
        s.messages.push({
          id: `msg_${crypto.randomUUID().replace(/-/g, '')}`,
          name,
          email,
          subject,
          message,
          status: 'unread',
          createdAtMillis: Date.now(),
        });
      });
      return jsonResponse({ ok: true }, 201);
    }

    const msgMatch = apiPath.match(/^\/messages\/([^/]+)$/);
    if (msgMatch && (method === 'PATCH' || method === 'DELETE')) {
      const id = decodeURIComponent(msgMatch[1]);
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Please sign in to continue.' }, 401);
      if (authUser.role !== 'author') return jsonResponse({ error: 'Author access required.' }, 403);

      if (method === 'PATCH') {
        const status = ((await req.json()) as { status?: string }).status;
        if (status !== 'unread' && status !== 'read' && status !== 'archived') {
          return jsonResponse({ error: 'Invalid status value.' }, 400);
        }
        await mutateState((s) => {
          const target = s.messages.find((m) => m.id === id);
          if (target) target.status = status;
        });
      } else {
        await mutateState((s) => {
          s.messages = s.messages.filter((m) => m.id !== id);
        });
      }
      return jsonResponse({ ok: true });
    }

    if (method === 'POST' && apiPath === '/assistant') {
      const { state } = await readState();
      const authUser = await extractBearerUser(req, state);
      if (!authUser) return jsonResponse({ error: 'Authentication required.' }, 401);
      return await handleAssistant(req, authUser);
    }

    return jsonResponse({ error: 'API route not found.' }, 404);
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    console.error('Netlify API error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      500,
    );
  }
}
