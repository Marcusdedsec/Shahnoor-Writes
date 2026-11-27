import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPassword } from './auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'shahnoor.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('reader', 'author')),
    bio TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    cover_image TEXT NOT NULL DEFAULT '',
    cover_caption TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Essays',
    tags_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK(status IN ('draft', 'published', 'scheduled')),
    featured INTEGER NOT NULL DEFAULT 0,
    author_name TEXT NOT NULL,
    author_id TEXT NOT NULL,
    reading_time_minutes INTEGER NOT NULL DEFAULT 5,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    publish_date TEXT NOT NULL,
    publish_at_millis INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL DEFAULT '#9C443B',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS thoughts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'Reflection',
    author_name TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    body TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('unread', 'read', 'archived')),
    created_at INTEGER NOT NULL
  );
`);

export interface DbUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  role: 'reader' | 'author';
  createdAtMillis: number;
  updatedAtMillis: number;
}

export interface DbArticle {
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

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
}

export interface DbThought {
  id: string;
  title: string;
  body: string;
  theme: string;
  authorName: string;
  authorId: string;
  createdAtMillis: number;
  updatedAtMillis: number;
}

export interface DbReflection {
  id: string;
  articleId: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAtMillis: number;
  updatedAtMillis: number;
}

export interface DbSubscriber {
  id: string;
  email: string;
  createdAtMillis: number;
}

export interface DbMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAtMillis: number;
}

function mapUserRow(row: Record<string, unknown>): DbUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    bio: String(row.bio ?? ''),
    role: row.role === 'author' ? 'author' : 'reader',
    createdAtMillis: Number(row.created_at),
    updatedAtMillis: Number(row.updated_at),
  };
}

function mapArticleRow(row: Record<string, unknown>): DbArticle {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(String(row.tags_json ?? '[]'));
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch {
    tags = [];
  }
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    subtitle: String(row.subtitle ?? ''),
    excerpt: String(row.excerpt ?? ''),
    content: String(row.content ?? ''),
    coverImage: String(row.cover_image ?? ''),
    coverCaption: String(row.cover_caption ?? ''),
    category: String(row.category ?? 'Essays'),
    tags,
    status: (row.status as DbArticle['status']) ?? 'draft',
    featured: Boolean(row.featured),
    isSample: false,
    authorName: String(row.author_name ?? 'Shahnoor'),
    authorId: String(row.author_id ?? ''),
    readingTimeMinutes: Number(row.reading_time_minutes ?? 5),
    seoTitle: String(row.seo_title ?? ''),
    seoDescription: String(row.seo_description ?? ''),
    publishDate: String(row.publish_date),
    publishAtMillis: Number(row.publish_at_millis),
    createdAtMillis: Number(row.created_at),
    updatedAtMillis: Number(row.updated_at),
  };
}

export function getAuthorConfig(): { displayName: string } | null {
  const row = db
    .prepare("SELECT name FROM users WHERE role = 'author' LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return { displayName: String(row.name) };
}

export function getUserById(id: string): DbUser | null {
  const row = db
    .prepare(
      'SELECT id, name, email, role, bio, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapUserRow(row) : null;
}

export function createReaderUser(input: {
  name: string;
  email: string;
  password: string;
  bio?: string;
}): DbUser {
  const cleanEmail = input.email.trim().toLowerCase();
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .get(cleanEmail) as Record<string, unknown> | undefined;
  if (existing) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const now = Date.now();
  const id = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const passwordHash = hashPassword(input.password);
  const cleanName = input.name.trim().slice(0, 80);
  const cleanBio = (input.bio ?? '').trim().slice(0, 300);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, bio, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'reader', ?, ?, ?)`,
  ).run(id, cleanName, cleanEmail, passwordHash, cleanBio, now, now);

  return {
    id,
    name: cleanName,
    email: cleanEmail,
    bio: cleanBio,
    role: 'reader',
    createdAtMillis: now,
    updatedAtMillis: now,
  };
}

export function createAuthorUserOnce(input: {
  name: string;
  email: string;
  password: string;
}): DbUser {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name.trim().slice(0, 80);
  const now = Date.now();
  const id = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const passwordHash = hashPassword(input.password);

  db.exec('BEGIN IMMEDIATE');
  try {
    const existingAuthor = db
      .prepare("SELECT id FROM users WHERE role = 'author' LIMIT 1")
      .get() as Record<string, unknown> | undefined;
    if (existingAuthor) {
      throw new Error('An author profile already exists. Please sign in with your email and password.');
    }

    const existingEmail = db
      .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
      .get(cleanEmail) as Record<string, unknown> | undefined;
    if (existingEmail) {
      throw new Error('This email is already used by a reader account. Please choose another email or sign in.');
    }

    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, bio, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'author', '', ?, ?)`,
    ).run(id, cleanName, cleanEmail, passwordHash, now, now);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    id,
    name: cleanName,
    email: cleanEmail,
    bio: '',
    role: 'author',
    createdAtMillis: now,
    updatedAtMillis: now,
  };
}

export function authenticateUser(email: string, password: string): DbUser | null {
  const cleanEmail = email.trim().toLowerCase();
  const row = db
    .prepare(
      'SELECT id, name, email, password_hash, role, bio, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    )
    .get(cleanEmail) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (!verifyPassword(password, String(row.password_hash))) return null;
  return mapUserRow(row);
}

export function updateUserProfileRecord(userId: string, name: string, bio: string): DbUser {
  const cleanName = name.trim().slice(0, 80);
  const cleanBio = bio.trim().slice(0, 300);
  const now = Date.now();
  db.prepare('UPDATE users SET name = ?, bio = ?, updated_at = ? WHERE id = ?').run(
    cleanName,
    cleanBio,
    now,
    userId,
  );
  const updated = getUserById(userId);
  if (!updated) throw new Error('Account not found.');
  return updated;
}

export function listPublishedArticles(nowMillis = Date.now()): DbArticle[] {
  const rows = db
    .prepare(
      `SELECT * FROM articles
       WHERE status = 'published' OR (status = 'scheduled' AND publish_at_millis <= ?)
       ORDER BY publish_date DESC, created_at DESC`,
    )
    .all(nowMillis) as Array<Record<string, unknown>>;
  return rows.map(mapArticleRow);
}

export function listAllArticles(): DbArticle[] {
  const rows = db
    .prepare('SELECT * FROM articles ORDER BY publish_date DESC, created_at DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapArticleRow);
}

export function getArticleById(id: string): DbArticle | null {
  const row = db
    .prepare('SELECT * FROM articles WHERE id = ? LIMIT 1')
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapArticleRow(row) : null;
}

export function upsertArticle(
  authorId: string,
  draft: {
    id?: string;
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
    authorName: string;
    readingTimeMinutes: number;
    seoTitle: string;
    seoDescription: string;
    publishDate: string;
    publishAtMillis: number;
  },
): DbArticle {
  const now = Date.now();
  const baseSlug =
    draft.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 140) || `essay-${now}`;

  const existing = draft.id
    ? (db.prepare('SELECT * FROM articles WHERE id = ? LIMIT 1').get(draft.id) as
        | Record<string, unknown>
        | undefined)
    : undefined;

  let finalSlug = baseSlug;
  const slugConflict = db
    .prepare('SELECT id FROM articles WHERE slug = ? LIMIT 1')
    .get(finalSlug) as Record<string, unknown> | undefined;
  if (slugConflict && String(slugConflict.id) !== existing?.id) {
    finalSlug = `${baseSlug.slice(0, 125)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const tagsJson = JSON.stringify(draft.tags.slice(0, 10));

  if (existing) {
    const id = String(existing.id);
    db.prepare(
      `UPDATE articles SET
        slug = ?, title = ?, subtitle = ?, excerpt = ?, content = ?,
        cover_image = ?, cover_caption = ?, category = ?, tags_json = ?,
        status = ?, featured = ?, author_name = ?, reading_time_minutes = ?,
        seo_title = ?, seo_description = ?, publish_date = ?, publish_at_millis = ?,
        updated_at = ?
      WHERE id = ?`,
    ).run(
      finalSlug,
      draft.title.trim().slice(0, 180),
      draft.subtitle.trim().slice(0, 280),
      draft.excerpt.trim().slice(0, 500),
      draft.content.slice(0, 80000),
      draft.coverImage.slice(0, 350000),
      draft.coverCaption.trim().slice(0, 300),
      draft.category.trim().slice(0, 50) || 'Essays',
      tagsJson,
      draft.status,
      draft.featured ? 1 : 0,
      draft.authorName.trim().slice(0, 80) || 'Shahnoor',
      Math.max(1, Math.min(180, Math.round(draft.readingTimeMinutes || 5))),
      draft.seoTitle.trim().slice(0, 180),
      draft.seoDescription.trim().slice(0, 320),
      draft.publishDate.slice(0, 40),
      draft.publishAtMillis,
      now,
      id,
    );
    return getArticleById(id)!;
  }

  const id = `art_${crypto.randomUUID().replace(/-/g, '')}`;
  db.prepare(
    `INSERT INTO articles (
      id, slug, title, subtitle, excerpt, content,
      cover_image, cover_caption, category, tags_json,
      status, featured, author_name, author_id, reading_time_minutes,
      seo_title, seo_description, publish_date, publish_at_millis,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    finalSlug,
    draft.title.trim().slice(0, 180),
    draft.subtitle.trim().slice(0, 280),
    draft.excerpt.trim().slice(0, 500),
    draft.content.slice(0, 80000),
    draft.coverImage.slice(0, 350000),
    draft.coverCaption.trim().slice(0, 300),
    draft.category.trim().slice(0, 50) || 'Essays',
    tagsJson,
    draft.status,
    draft.featured ? 1 : 0,
    draft.authorName.trim().slice(0, 80) || 'Shahnoor',
    authorId,
    Math.max(1, Math.min(180, Math.round(draft.readingTimeMinutes || 5))),
    draft.seoTitle.trim().slice(0, 180),
    draft.seoDescription.trim().slice(0, 320),
    draft.publishDate.slice(0, 40),
    draft.publishAtMillis,
    now,
    now,
  );
  return getArticleById(id)!;
}

export function deleteArticleRecord(id: string): void {
  db.prepare('DELETE FROM reflections WHERE article_id = ?').run(id);
  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
}

export function listCategories(): DbCategory[] {
  const rows = db
    .prepare('SELECT id, name, slug, description, accent FROM categories ORDER BY created_at ASC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description ?? ''),
    accent: String(r.accent ?? '#9C443B'),
  }));
}

export function upsertCategory(input: {
  name: string;
  slug: string;
  description: string;
  accent: string;
}): DbCategory {
  const now = Date.now();
  const cleanSlug = input.slug.slice(0, 60);
  db.prepare(
    `INSERT INTO categories (id, name, slug, description, accent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, accent = excluded.accent`,
  ).run(
    cleanSlug,
    input.name.trim().slice(0, 50),
    cleanSlug,
    input.description.trim().slice(0, 300),
    input.accent.slice(0, 30),
    now,
  );
  return {
    id: cleanSlug,
    name: input.name.trim().slice(0, 50),
    slug: cleanSlug,
    description: input.description.trim().slice(0, 300),
    accent: input.accent.slice(0, 30),
  };
}

export function deleteCategoryRecord(id: string): void {
  db.prepare('DELETE FROM categories WHERE id = ? OR slug = ?').run(id, id);
}

export function listThoughts(): DbThought[] {
  const rows = db
    .prepare('SELECT * FROM thoughts ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    body: String(r.body),
    theme: String(r.theme ?? 'Reflection'),
    authorName: String(r.author_name ?? 'Reader'),
    authorId: String(r.author_id),
    createdAtMillis: Number(r.created_at),
    updatedAtMillis: Number(r.updated_at),
  }));
}

export function saveThoughtRecord(
  user: DbUser,
  draft: { id?: string; title: string; body: string; theme: string },
): DbThought {
  const now = Date.now();
  const cleanTitle = draft.title.trim().slice(0, 140);
  const cleanBody = draft.body.trim().slice(0, 8000);
  const cleanTheme = (draft.theme || 'Reflection').trim().slice(0, 40);

  if (draft.id) {
    const existing = db
      .prepare('SELECT * FROM thoughts WHERE id = ? LIMIT 1')
      .get(draft.id) as Record<string, unknown> | undefined;
    if (!existing) {
      throw new Error('Thought not found.');
    }
    if (String(existing.author_id) !== user.id && user.role !== 'author') {
      throw new Error('You may only edit your own thoughts.');
    }
    db.prepare(
      'UPDATE thoughts SET title = ?, body = ?, theme = ?, author_name = ?, updated_at = ? WHERE id = ?',
    ).run(cleanTitle, cleanBody, cleanTheme, user.name, now, draft.id);
    return {
      id: draft.id,
      title: cleanTitle,
      body: cleanBody,
      theme: cleanTheme,
      authorName: user.name,
      authorId: String(existing.author_id),
      createdAtMillis: Number(existing.created_at),
      updatedAtMillis: now,
    };
  }

  const id = `tht_${crypto.randomUUID().replace(/-/g, '')}`;
  db.prepare(
    `INSERT INTO thoughts (id, title, body, theme, author_name, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, cleanTitle, cleanBody, cleanTheme, user.name, user.id, now, now);

  return {
    id,
    title: cleanTitle,
    body: cleanBody,
    theme: cleanTheme,
    authorName: user.name,
    authorId: user.id,
    createdAtMillis: now,
    updatedAtMillis: now,
  };
}

export function deleteThoughtRecord(user: DbUser, thoughtId: string): void {
  const existing = db
    .prepare('SELECT author_id FROM thoughts WHERE id = ? LIMIT 1')
    .get(thoughtId) as Record<string, unknown> | undefined;
  if (!existing) return;
  if (String(existing.author_id) !== user.id && user.role !== 'author') {
    throw new Error('You may only remove your own thoughts.');
  }
  db.prepare('DELETE FROM thoughts WHERE id = ?').run(thoughtId);
}

export function listReflections(articleId: string): DbReflection[] {
  const rows = db
    .prepare('SELECT * FROM reflections WHERE article_id = ? ORDER BY created_at DESC')
    .all(articleId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    articleId: String(r.article_id),
    body: String(r.body),
    authorName: String(r.author_name ?? 'Reader'),
    authorId: String(r.author_id),
    createdAtMillis: Number(r.created_at),
    updatedAtMillis: Number(r.updated_at),
  }));
}

export function addReflectionRecord(user: DbUser, articleId: string, body: string): DbReflection {
  const article = getArticleById(articleId);
  if (!article || (article.status !== 'published' && user.role !== 'author')) {
    throw new Error('Reflections can only be posted on published essays.');
  }
  const now = Date.now();
  const id = `ref_${crypto.randomUUID().replace(/-/g, '')}`;
  const cleanBody = body.trim().slice(0, 2000);
  db.prepare(
    `INSERT INTO reflections (id, article_id, body, author_name, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, articleId, cleanBody, user.name, user.id, now, now);

  return {
    id,
    articleId,
    body: cleanBody,
    authorName: user.name,
    authorId: user.id,
    createdAtMillis: now,
    updatedAtMillis: now,
  };
}

export function deleteReflectionRecord(
  user: DbUser,
  articleId: string,
  reflectionId: string,
): void {
  const existing = db
    .prepare('SELECT author_id FROM reflections WHERE id = ? AND article_id = ? LIMIT 1')
    .get(reflectionId, articleId) as Record<string, unknown> | undefined;
  if (!existing) return;
  if (String(existing.author_id) !== user.id && user.role !== 'author') {
    throw new Error('You may only remove your own reflections.');
  }
  db.prepare('DELETE FROM reflections WHERE id = ? AND article_id = ?').run(
    reflectionId,
    articleId,
  );
}

export function addSubscriberRecord(email: string): void {
  const cleanEmail = email.trim().toLowerCase().slice(0, 160);
  const id = `sub_${crypto.randomUUID().replace(/-/g, '')}`;
  db.prepare(
    'INSERT OR IGNORE INTO subscribers (id, email, created_at) VALUES (?, ?, ?)',
  ).run(id, cleanEmail, Date.now());
}

export function listSubscribers(): DbSubscriber[] {
  const rows = db
    .prepare('SELECT id, email, created_at FROM subscribers ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    createdAtMillis: Number(r.created_at),
  }));
}

export function addContactMessageRecord(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): void {
  const id = `msg_${crypto.randomUUID().replace(/-/g, '')}`;
  db.prepare(
    `INSERT INTO messages (id, name, email, subject, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'unread', ?)`,
  ).run(
    id,
    input.name.trim().slice(0, 100),
    input.email.trim().toLowerCase().slice(0, 160),
    input.subject.trim().slice(0, 180),
    input.message.trim().slice(0, 5000),
    Date.now(),
  );
}

export function listMessages(): DbMessage[] {
  const rows = db
    .prepare('SELECT * FROM messages ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    subject: String(r.subject),
    message: String(r.message),
    status: (r.status as DbMessage['status']) ?? 'unread',
    createdAtMillis: Number(r.created_at),
  }));
}

export function updateMessageStatusRecord(id: string, status: DbMessage['status']): void {
  db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, id);
}

export function deleteMessageRecord(id: string): void {
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
}
