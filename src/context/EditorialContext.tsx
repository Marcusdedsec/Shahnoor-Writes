import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CATEGORIES } from '../data/sampleArticles';
import {
  Article,
  ArticleReflection,
  CategoryInfo,
  CommunityThought,
  ContactMessage,
  Subscriber,
  UserProfile,
} from '../types/editorial';
import { calculateReadingTime, slugify } from '../utils/editorialUtils';

export interface SessionUser {
  uid: string;
  displayName: string;
  email: string;
  bio: string;
  role: 'reader' | 'author';
  createdAtMillis?: number;
  updatedAtMillis?: number;
}

export interface AuthorConfig {
  displayName: string;
}

interface ServerUserDto {
  id: string;
  name: string;
  email: string;
  bio: string;
  role: 'reader' | 'author';
  createdAtMillis?: number;
  updatedAtMillis?: number;
}

interface BootstrapResponse {
  user?: ServerUserDto | null;
  authorConfig?: AuthorConfig | null;
  publishedArticles?: Article[];
  allArticles?: Article[];
  categories?: CategoryInfo[];
  thoughts?: CommunityThought[];
  subscribers?: Subscriber[];
  messages?: ContactMessage[];
}

interface EditorialContextValue {
  user: SessionUser | null;
  userProfile: UserProfile | null;
  authToken: string | null;
  authReady: boolean;
  authorConfig: AuthorConfig | null;
  authorConfigLoaded: boolean;
  isAdmin: boolean;
  loadingArticles: boolean;
  loadingThoughts: boolean;
  publishedArticles: Article[];
  allArticles: Article[];
  categories: CategoryInfo[];
  thoughts: CommunityThought[];
  subscribers: Subscriber[];
  messages: ContactMessage[];
  signUpWithEmail: (payload: {
    displayName: string;
    email: string;
    password: string;
    bio?: string;
  }) => Promise<void>;
  createAuthorProfile: (payload: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  updateUserProfile: (displayName: string, bio: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  saveArticle: (
    draft: Omit<Article, 'id' | 'authorId' | 'createdAtMillis' | 'updatedAtMillis'> & {
      id?: string;
    },
  ) => Promise<string>;
  deleteArticle: (id: string) => Promise<void>;
  addCategory: (cat: { name: string; description: string; accent: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveThought: (draft: {
    id?: string;
    title: string;
    body: string;
    theme: string;
  }) => Promise<string>;
  deleteThought: (id: string) => Promise<void>;
  subscribeArticleReflections: (
    articleId: string,
    onData: (items: ArticleReflection[]) => void,
    onError?: (err: Error) => void,
  ) => () => void;
  addArticleReflection: (articleId: string, body: string) => Promise<void>;
  deleteArticleReflection: (articleId: string, reflectionId: string) => Promise<void>;
  subscribeNewsletter: (email: string) => Promise<void>;
  sendContactMessage: (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => Promise<void>;
  updateMessageStatus: (id: string, status: ContactMessage['status']) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
}

const EditorialContext = createContext<EditorialContextValue | undefined>(undefined);

function toSessionUser(dto: ServerUserDto): SessionUser {
  return {
    uid: dto.id,
    displayName: dto.name,
    email: dto.email,
    bio: dto.bio ?? '',
    role: dto.role,
    createdAtMillis: dto.createdAtMillis,
    updatedAtMillis: dto.updatedAtMillis,
  };
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof parsed.error === 'string' && parsed.error
        ? parsed.error
        : `Request failed (${res.status})`;
    throw new Error(errMsg);
  }

  return parsed as T;
}

export const EditorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorConfig, setAuthorConfig] = useState<AuthorConfig | null>(null);
  const [authorConfigLoaded, setAuthorConfigLoaded] = useState(false);

  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [dbAllAdmin, setDbAllAdmin] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingThoughts, setLoadingThoughts] = useState(true);
  const [thoughts, setThoughts] = useState<CommunityThought[]>([]);
  const [dbCategories, setDbCategories] = useState<CategoryInfo[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [reflectionTick, setReflectionTick] = useState(0);

  const isAdmin = Boolean(user && user.role === 'author');

  const userProfile = useMemo<UserProfile | null>(() => {
    if (!user) return null;
    return {
      id: user.uid,
      displayName: user.displayName,
      bio: user.bio,
      createdAtMillis: user.createdAtMillis,
      updatedAtMillis: user.updatedAtMillis,
    };
  }, [user]);

  const loadBootstrap = useCallback(
    async (tokenOverride?: string | null) => {
      const effectiveToken = tokenOverride !== undefined ? tokenOverride : authToken;
      try {
        const data = await apiRequest<BootstrapResponse>('/api/bootstrap', { method: 'GET' }, effectiveToken);
        setAuthorConfig(data.authorConfig ?? null);
        setAuthorConfigLoaded(true);
        setPublishedArticles(data.publishedArticles ?? []);
        setDbCategories(data.categories ?? []);
        setThoughts(data.thoughts ?? []);
        if (data.user) {
          setUser(toSessionUser(data.user));
          if (data.user.role === 'author') {
            setDbAllAdmin(data.allArticles ?? []);
            setSubscribers(data.subscribers ?? []);
            setMessages(data.messages ?? []);
          } else {
            setDbAllAdmin([]);
            setSubscribers([]);
            setMessages([]);
          }
        } else if (effectiveToken) {
          // Token rejected or expired
          setAuthToken(null);
          setUser(null);
          setDbAllAdmin([]);
          setSubscribers([]);
          setMessages([]);
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setAuthReady(true);
        setAuthorConfigLoaded(true);
        setLoadingArticles(false);
        setLoadingThoughts(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    void loadBootstrap(null);
    // Initial boot only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allArticles = useMemo(() => {
    if (isAdmin) return dbAllAdmin;
    return publishedArticles;
  }, [isAdmin, dbAllAdmin, publishedArticles]);

  const categories = useMemo(() => {
    const map = new Map<string, CategoryInfo>();
    DEFAULT_CATEGORIES.forEach((c) => map.set(c.slug, c));
    dbCategories.forEach((c) => map.set(c.slug, c));
    return Array.from(map.values());
  }, [dbCategories]);

  const signUpWithEmail: EditorialContextValue['signUpWithEmail'] = async ({
    displayName,
    email,
    password,
    bio = '',
  }) => {
    const res = await apiRequest<{ token: string; user: ServerUserDto }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: displayName, email, password, bio }),
    });
    setAuthToken(res.token);
    setUser(toSessionUser(res.user));
    await loadBootstrap(res.token);
  };

  const createAuthorProfile: EditorialContextValue['createAuthorProfile'] = async ({
    displayName,
    email,
    password,
  }) => {
    const res = await apiRequest<{ token: string; user: ServerUserDto }>('/api/auth/author-setup', {
      method: 'POST',
      body: JSON.stringify({ name: displayName, email, password }),
    });
    setAuthToken(res.token);
    setUser(toSessionUser(res.user));
    setAuthorConfig({ displayName: res.user.name });
    await loadBootstrap(res.token);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: ServerUserDto }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    setUser(toSessionUser(res.user));
    await loadBootstrap(res.token);
  };

  const updateUserProfile = async (displayName: string, bio: string) => {
    if (!authToken) throw new Error('Please sign in to update your profile.');
    const res = await apiRequest<{ user: ServerUserDto }>(
      '/api/auth/profile',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: displayName, bio }),
      },
      authToken,
    );
    setUser(toSessionUser(res.user));
    if (res.user.role === 'author') {
      setAuthorConfig({ displayName: res.user.name });
    }
  };

  const signOutUser = async () => {
    setAuthToken(null);
    setUser(null);
    setDbAllAdmin([]);
    setSubscribers([]);
    setMessages([]);
  };

  const saveArticle: EditorialContextValue['saveArticle'] = async (draft) => {
    if (!authToken || !isAdmin) {
      throw new Error('Only the publication author may save or publish articles.');
    }

    const readingTime =
      draft.readingTimeMinutes > 0
        ? Math.min(180, Math.round(draft.readingTimeMinutes))
        : calculateReadingTime(draft.content);

    const res = await apiRequest<{ article: Article }>(
      '/api/articles',
      {
        method: 'POST',
        body: JSON.stringify({
          ...draft,
          slug: slugify(draft.slug || draft.title) || `essay-${Date.now()}`,
          readingTimeMinutes: readingTime,
        }),
      },
      authToken,
    );

    await loadBootstrap(authToken);
    return res.article.id;
  };

  const deleteArticle = async (id: string) => {
    if (!authToken || !isAdmin) throw new Error('Author access required.');
    await apiRequest(`/api/articles/${encodeURIComponent(id)}`, { method: 'DELETE' }, authToken);
    await loadBootstrap(authToken);
  };

  const addCategory: EditorialContextValue['addCategory'] = async (cat) => {
    if (!authToken || !isAdmin) throw new Error('Author access required.');
    await apiRequest(
      '/api/categories',
      {
        method: 'POST',
        body: JSON.stringify(cat),
      },
      authToken,
    );
    await loadBootstrap(authToken);
  };

  const deleteCategory = async (id: string) => {
    if (!authToken || !isAdmin) throw new Error('Author access required.');
    await apiRequest(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }, authToken);
    await loadBootstrap(authToken);
  };

  const saveThought: EditorialContextValue['saveThought'] = async (draft) => {
    if (!authToken) throw new Error('Please sign in to share a thought.');
    const res = await apiRequest<{ thought: CommunityThought }>(
      '/api/thoughts',
      {
        method: 'POST',
        body: JSON.stringify(draft),
      },
      authToken,
    );
    await loadBootstrap(authToken);
    return res.thought.id;
  };

  const deleteThought = async (id: string) => {
    if (!authToken) throw new Error('Please sign in to remove your thought.');
    await apiRequest(`/api/thoughts/${encodeURIComponent(id)}`, { method: 'DELETE' }, authToken);
    await loadBootstrap(authToken);
  };

  const subscribeArticleReflections: EditorialContextValue['subscribeArticleReflections'] = useCallback(
    (articleId, onData, onError) => {
      let active = true;

      const load = async () => {
        try {
          const data = await apiRequest<{ reflections: ArticleReflection[] }>(
            `/api/articles/${encodeURIComponent(articleId)}/reflections`,
            { method: 'GET' },
            authToken,
          );
          if (active) onData(data.reflections ?? []);
        } catch (err) {
          if (active && onError) {
            onError(err instanceof Error ? err : new Error('Unable to load reflections.'));
          }
        }
      };

      void load();
      const timer = window.setInterval(() => {
        void load();
      }, 15000);

      return () => {
        active = false;
        window.clearInterval(timer);
      };
    },
    // Re-run whenever reflectionTick changes so post/delete refreshes immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authToken, reflectionTick],
  );

  const addArticleReflection = async (articleId: string, body: string) => {
    if (!authToken) throw new Error('Please sign in to leave a reflection.');
    await apiRequest(
      `/api/articles/${encodeURIComponent(articleId)}/reflections`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
      authToken,
    );
    setReflectionTick((t) => t + 1);
  };

  const deleteArticleReflection = async (articleId: string, reflectionId: string) => {
    if (!authToken) throw new Error('Please sign in first.');
    await apiRequest(
      `/api/articles/${encodeURIComponent(articleId)}/reflections/${encodeURIComponent(reflectionId)}`,
      { method: 'DELETE' },
      authToken,
    );
    setReflectionTick((t) => t + 1);
  };

  const subscribeNewsletter = async (email: string) => {
    await apiRequest('/api/subscribers', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (isAdmin && authToken) {
      await loadBootstrap(authToken);
    }
  };

  const sendContactMessage: EditorialContextValue['sendContactMessage'] = async (payload) => {
    await apiRequest('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (isAdmin && authToken) {
      await loadBootstrap(authToken);
    }
  };

  const updateMessageStatus = async (id: string, status: ContactMessage['status']) => {
    if (!authToken || !isAdmin) throw new Error('Author access required.');
    await apiRequest(
      `/api/messages/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      authToken,
    );
    await loadBootstrap(authToken);
  };

  const deleteMessage = async (id: string) => {
    if (!authToken || !isAdmin) throw new Error('Author access required.');
    await apiRequest(`/api/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }, authToken);
    await loadBootstrap(authToken);
  };

  const value: EditorialContextValue = {
    user,
    userProfile,
    authToken,
    authReady,
    authorConfig,
    authorConfigLoaded,
    isAdmin,
    loadingArticles,
    loadingThoughts,
    publishedArticles,
    allArticles,
    categories,
    thoughts,
    subscribers,
    messages,
    signUpWithEmail,
    createAuthorProfile,
    signInWithEmail,
    updateUserProfile,
    signOutUser,
    saveArticle,
    deleteArticle,
    addCategory,
    deleteCategory,
    saveThought,
    deleteThought,
    subscribeArticleReflections,
    addArticleReflection,
    deleteArticleReflection,
    subscribeNewsletter,
    sendContactMessage,
    updateMessageStatus,
    deleteMessage,
  };

  return <EditorialContext.Provider value={value}>{children}</EditorialContext.Provider>;
};

export function useEditorial(): EditorialContextValue {
  const ctx = useContext(EditorialContext);
  if (!ctx) throw new Error('useEditorial must be used within EditorialProvider');
  return ctx;
}
