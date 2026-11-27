export type ArticleStatus = 'draft' | 'published' | 'scheduled';

export interface Article {
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
  status: ArticleStatus;
  featured: boolean;
  isSample: boolean;
  authorName: string;
  authorId: string;
  readingTimeMinutes: number;
  seoTitle: string;
  seoDescription: string;
  publishDate: string;
  publishAtMillis?: number;
  createdAtMillis?: number;
  updatedAtMillis?: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAtMillis: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAtMillis: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  createdAtMillis?: number;
  updatedAtMillis?: number;
}

export interface CommunityThought {
  id: string;
  title: string;
  body: string;
  theme: string;
  authorName: string;
  authorId: string;
  createdAtMillis?: number;
  updatedAtMillis?: number;
}

export interface ArticleReflection {
  id: string;
  articleId: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAtMillis?: number;
  updatedAtMillis?: number;
}
