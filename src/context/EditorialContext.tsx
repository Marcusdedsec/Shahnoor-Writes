import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  OperationType,
  PRIMARY_ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
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

interface EditorialContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  loadingArticles: boolean;
  loadingThoughts: boolean;
  publishedArticles: Article[];
  allArticles: Article[];
  categories: CategoryInfo[];
  thoughts: CommunityThought[];
  subscribers: Subscriber[];
  messages: ContactMessage[];
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (payload: {
    displayName: string;
    email: string;
    password: string;
    bio?: string;
  }) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserSession: () => Promise<boolean>;
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

function mapDocToArticle(id: string, data: Record<string, unknown>): Article {
  const publishAt = data.publishAt instanceof Timestamp ? data.publishAt.toMillis() : undefined;
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined;
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined;
  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? ''),
    subtitle: String(data.subtitle ?? ''),
    excerpt: String(data.excerpt ?? ''),
    content: String(data.content ?? ''),
    coverImage: String(data.coverImage ?? ''),
    coverCaption: String(data.coverCaption ?? ''),
    category: String(data.category ?? 'Essays'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status: (data.status as Article['status']) ?? 'draft',
    featured: Boolean(data.featured),
    isSample: Boolean(data.isSample),
    authorName: String(data.authorName ?? 'Shahnoor'),
    authorId: String(data.authorId ?? ''),
    readingTimeMinutes: Number(data.readingTimeMinutes ?? 5),
    seoTitle: String(data.seoTitle ?? ''),
    seoDescription: String(data.seoDescription ?? ''),
    publishDate: String(data.publishDate ?? new Date().toISOString().slice(0, 10)),
    publishAtMillis: publishAt,
    createdAtMillis: createdAt,
    updatedAtMillis: updatedAt,
  };
}

function mapDocToThought(id: string, data: Record<string, unknown>): CommunityThought {
  return {
    id,
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    theme: String(data.theme ?? 'Reflection'),
    authorName: String(data.authorName ?? 'Reader'),
    authorId: String(data.authorId ?? ''),
    createdAtMillis:
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAtMillis:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  };
}

async function resolveAdminStatus(nextUser: User | null): Promise<boolean> {
  if (!nextUser || !nextUser.emailVerified) return false;
  if (nextUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) return true;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export const EditorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [dbPublished, setDbPublished] = useState<Article[]>([]);
  const [dbScheduledReady, setDbScheduledReady] = useState<Article[]>([]);
  const [dbAllAdmin, setDbAllAdmin] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingThoughts, setLoadingThoughts] = useState(true);
  const [thoughts, setThoughts] = useState<CommunityThought[]>([]);
  const [dbCategories, setDbCategories] = useState<CategoryInfo[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsAdmin(await resolveAdminStatus(nextUser));
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Subscribe to signed-in user's public profile (/users/{uid})
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const profileRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      profileRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          setUserProfile({
            id: snap.id,
            displayName: String(data.displayName ?? user.displayName ?? 'Reader'),
            bio: String(data.bio ?? ''),
            createdAtMillis:
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
            updatedAtMillis:
              data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
          });
        } else {
          // Ensure a clean public profile document exists for Google/new sign-ins
          const fallbackName = (user.displayName || user.email?.split('@')[0] || 'Reader')
            .trim()
            .slice(0, 80);
          try {
            await setDoc(profileRef, {
              displayName: fallbackName || 'Reader',
              bio: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Ignore transient race if signup is writing the profile concurrently
          }
        }
      },
      () => {},
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const qPub = query(collection(db, 'articles'), where('status', '==', 'published'));
    const unsubPub = onSnapshot(
      qPub,
      (snap) => {
        const list = snap.docs.map((d) => mapDocToArticle(d.id, d.data() as Record<string, unknown>));
        setDbPublished(list);
        setLoadingArticles(false);
      },
      (err) => {
        console.error('Published articles subscription error:', err);
        setLoadingArticles(false);
      },
    );

    const qSched = query(
      collection(db, 'articles'),
      where('status', '==', 'scheduled'),
      where('publishAt', '<=', Timestamp.now()),
    );
    const unsubSched = onSnapshot(
      qSched,
      (snap) => {
        const list = snap.docs.map((d) => mapDocToArticle(d.id, d.data() as Record<string, unknown>));
        setDbScheduledReady(list);
      },
      () => {},
    );

    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: CategoryInfo[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: String(data.name ?? ''),
            slug: String(data.slug ?? d.id),
            description: String(data.description ?? ''),
            accent: String(data.accent ?? '#9C443B'),
          };
        });
        setDbCategories(list);
      },
      () => {},
    );

    const qThoughts = query(collection(db, 'thoughts'), orderBy('createdAt', 'desc'));
    const unsubThoughts = onSnapshot(
      qThoughts,
      (snap) => {
        setThoughts(
          snap.docs.map((d) => mapDocToThought(d.id, d.data() as Record<string, unknown>)),
        );
        setLoadingThoughts(false);
      },
      (err) => {
        console.error('Thoughts subscription error:', err);
        setLoadingThoughts(false);
      },
    );

    return () => {
      unsubPub();
      unsubSched();
      unsubCats();
      unsubThoughts();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !isAdmin) {
      setDbAllAdmin([]);
      setSubscribers([]);
      setMessages([]);
      return;
    }

    const unsubAdminArticles = onSnapshot(
      collection(db, 'articles'),
      (snap) => {
        const list = snap.docs
          .map((d) => mapDocToArticle(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
        setDbAllAdmin(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'articles'),
    );

    const unsubSubscribers = onSnapshot(
      query(collection(db, 'subscribers'), orderBy('createdAt', 'desc')),
      (snap) => {
        setSubscribers(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              email: String(data.email ?? ''),
              createdAtMillis:
                data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
            };
          }),
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscribers'),
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              name: String(data.name ?? ''),
              email: String(data.email ?? ''),
              subject: String(data.subject ?? ''),
              message: String(data.message ?? ''),
              status: (data.status as ContactMessage['status']) ?? 'unread',
              createdAtMillis:
                data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
            };
          }),
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'messages'),
    );

    return () => {
      unsubAdminArticles();
      unsubSubscribers();
      unsubMessages();
    };
  }, [authReady, isAdmin]);

  const publishedArticles = useMemo(() => {
    const merged = new Map<string, Article>();
    [...dbPublished, ...dbScheduledReady].forEach((a) => merged.set(a.id, a));
    return Array.from(merged.values()).sort((a, b) => b.publishDate.localeCompare(a.publishDate));
  }, [dbPublished, dbScheduledReady]);

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

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signUpWithEmail: EditorialContextValue['signUpWithEmail'] = async ({
    displayName,
    email,
    password,
    bio = '',
  }) => {
    const cleanName = displayName.trim().slice(0, 80);
    if (!cleanName) throw new Error('Please enter your display name.');
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: cleanName });
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: cleanName,
        bio: bio.trim().slice(0, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${cred.user.uid}`);
    }
    await sendEmailVerification(cred.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('Please sign in first.');
    await sendEmailVerification(auth.currentUser);
  };

  const refreshUserSession = async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshed = auth.currentUser;
    setUser(refreshed ? ({ ...refreshed } as User) : null);
    setIsAdmin(await resolveAdminStatus(refreshed));
    return Boolean(refreshed?.emailVerified);
  };

  const updateUserProfile = async (displayName: string, bio: string) => {
    if (!auth.currentUser) throw new Error('Please sign in to update your profile.');
    const cleanName = displayName.trim().slice(0, 80);
    const cleanBio = bio.trim().slice(0, 300);
    if (!cleanName) throw new Error('Display name cannot be empty.');

    await updateProfile(auth.currentUser, { displayName: cleanName });
    const profileRef = doc(db, 'users', auth.currentUser.uid);
    const snap = await getDoc(profileRef);
    try {
      if (snap.exists()) {
        const existingData = snap.data();
        await updateDoc(profileRef, {
          displayName: cleanName,
          bio: cleanBio,
          createdAt: existingData.createdAt,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(profileRef, {
          displayName: cleanName,
          bio: cleanBio,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        `users/${auth.currentUser.uid}`,
      );
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const saveArticle: EditorialContextValue['saveArticle'] = async (draft) => {
    if (!user || !isAdmin) {
      throw new Error('Only the verified publication owner may save or publish articles.');
    }

    const cleanSlug = slugify(draft.slug || draft.title) || `essay-${Date.now()}`;
    const docId = draft.id && /^[a-zA-Z0-9_-]+$/.test(draft.id) ? draft.id : cleanSlug;
    const articleRef = doc(db, 'articles', docId);
    const existingSnap = await getDoc(articleRef);

    const publishDateStr = (draft.publishDate || new Date().toISOString().slice(0, 10)).slice(0, 40);
    const parsedPublishDate = new Date(
      publishDateStr.includes('T') ? publishDateStr : `${publishDateStr}T08:00:00`,
    );
    const publishAtTs = Timestamp.fromDate(
      Number.isNaN(parsedPublishDate.getTime()) ? new Date() : parsedPublishDate,
    );

    const readingTime =
      draft.readingTimeMinutes > 0
        ? Math.min(180, Math.round(draft.readingTimeMinutes))
        : calculateReadingTime(draft.content);

    const cleanTags = draft.tags
      .map((t) => t.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 10);

    const basePayload = {
      slug: cleanSlug.slice(0, 140),
      title: draft.title.trim().slice(0, 180),
      subtitle: draft.subtitle.trim().slice(0, 280),
      excerpt: draft.excerpt.trim().slice(0, 500),
      content: draft.content.slice(0, 80000),
      coverImage: draft.coverImage.slice(0, 350000),
      coverCaption: draft.coverCaption.trim().slice(0, 300),
      category: (draft.category || 'Essays').trim().slice(0, 50),
      tags: cleanTags,
      status: draft.status,
      featured: Boolean(draft.featured),
      isSample: false,
      authorName: (draft.authorName || 'Shahnoor').trim().slice(0, 80),
      readingTimeMinutes: readingTime,
      seoTitle: draft.seoTitle.trim().slice(0, 180),
      seoDescription: draft.seoDescription.trim().slice(0, 320),
      publishDate: publishDateStr,
      publishAt: publishAtTs,
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        await updateDoc(articleRef, {
          ...basePayload,
          authorId: existingData.authorId,
          createdAt: existingData.createdAt,
        });
      } else {
        await setDoc(articleRef, {
          ...basePayload,
          authorId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      return docId;
    } catch (error) {
      handleFirestoreError(
        error,
        existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        `articles/${docId}`,
      );
    }
  };

  const deleteArticle = async (id: string) => {
    if (!user || !isAdmin) throw new Error('Admin authorization required.');
    try {
      await deleteDoc(doc(db, 'articles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `articles/${id}`);
    }
  };

  const addCategory: EditorialContextValue['addCategory'] = async (cat) => {
    if (!user || !isAdmin) throw new Error('Admin authorization required.');
    const slug = slugify(cat.name).slice(0, 60);
    if (!slug) throw new Error('Please provide a valid category name.');
    try {
      await setDoc(doc(db, 'categories', slug), {
        name: cat.name.trim().slice(0, 50),
        slug,
        description: cat.description.trim().slice(0, 300),
        accent: cat.accent.slice(0, 30),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `categories/${slug}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user || !isAdmin) throw new Error('Admin authorization required.');
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const saveThought: EditorialContextValue['saveThought'] = async (draft) => {
    const activeUser = auth.currentUser;
    if (!activeUser) throw new Error('Please sign in to share a thought.');
    if (!activeUser.emailVerified) {
      throw new Error('Please verify your email address before sharing thoughts.');
    }

    const cleanTitle = draft.title.trim().slice(0, 140);
    const cleanBody = draft.body.trim().slice(0, 8000);
    const cleanTheme = (draft.theme || 'Reflection').trim().slice(0, 40);
    if (!cleanTitle || !cleanBody) {
      throw new Error('Please include both a title and your reflection.');
    }

    const authorName = (
      userProfile?.displayName ||
      activeUser.displayName ||
      activeUser.email?.split('@')[0] ||
      'Reader'
    )
      .trim()
      .slice(0, 80);

    const docId =
      draft.id && /^[a-zA-Z0-9_-]+$/.test(draft.id)
        ? draft.id
        : `thought-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ref = doc(db, 'thoughts', docId);
    const existingSnap = await getDoc(ref);

    try {
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        await updateDoc(ref, {
          title: cleanTitle,
          body: cleanBody,
          theme: cleanTheme,
          authorName,
          authorId: existingData.authorId,
          createdAt: existingData.createdAt,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          title: cleanTitle,
          body: cleanBody,
          theme: cleanTheme,
          authorName,
          authorId: activeUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return docId;
    } catch (error) {
      handleFirestoreError(
        error,
        existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        `thoughts/${docId}`,
      );
    }
  };

  const deleteThought = async (id: string) => {
    const activeUser = auth.currentUser;
    if (!activeUser) throw new Error('Please sign in to remove your thought.');
    try {
      await deleteDoc(doc(db, 'thoughts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `thoughts/${id}`);
    }
  };

  const subscribeArticleReflections: EditorialContextValue['subscribeArticleReflections'] = (
    articleId,
    onData,
    onError,
  ) => {
    const q = query(
      collection(db, 'articles', articleId, 'reflections'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        onData(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              articleId: String(data.articleId ?? articleId),
              body: String(data.body ?? ''),
              authorName: String(data.authorName ?? 'Reader'),
              authorId: String(data.authorId ?? ''),
              createdAtMillis:
                data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
              updatedAtMillis:
                data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
            };
          }),
        );
      },
      (err) => {
        if (onError) onError(err);
      },
    );
  };

  const addArticleReflection = async (articleId: string, body: string) => {
    const activeUser = auth.currentUser;
    if (!activeUser) throw new Error('Please sign in to leave a reflection.');
    if (!activeUser.emailVerified) {
      throw new Error('Please verify your email address before posting a reflection.');
    }
    const cleanBody = body.trim().slice(0, 2000);
    if (!cleanBody) throw new Error('Please write a brief reflection before posting.');

    const authorName = (
      userProfile?.displayName ||
      activeUser.displayName ||
      activeUser.email?.split('@')[0] ||
      'Reader'
    )
      .trim()
      .slice(0, 80);

    const refId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await setDoc(doc(db, 'articles', articleId, 'reflections', refId), {
        articleId,
        body: cleanBody,
        authorName,
        authorId: activeUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `articles/${articleId}/reflections/${refId}`,
      );
    }
  };

  const deleteArticleReflection = async (articleId: string, reflectionId: string) => {
    const activeUser = auth.currentUser;
    if (!activeUser) throw new Error('Please sign in first.');
    try {
      await deleteDoc(doc(db, 'articles', articleId, 'reflections', reflectionId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `articles/${articleId}/reflections/${reflectionId}`,
      );
    }
  };

  const subscribeNewsletter = async (email: string) => {
    const normalized = email.trim().toLowerCase().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('Please enter a valid email address.');
    }
    const safeId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await setDoc(doc(db, 'subscribers', safeId), {
        email: normalized,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subscribers/${safeId}`);
    }
  };

  const sendContactMessage: EditorialContextValue['sendContactMessage'] = async (payload) => {
    const email = payload.email.trim().toLowerCase().slice(0, 160);
    if (!payload.name.trim() || !payload.subject.trim() || !payload.message.trim()) {
      throw new Error('Please complete all fields before sending your letter.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please provide a valid email address.');
    }
    const safeId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await setDoc(doc(db, 'messages', safeId), {
        name: payload.name.trim().slice(0, 100),
        email,
        subject: payload.subject.trim().slice(0, 180),
        message: payload.message.trim().slice(0, 5000),
        status: 'unread',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `messages/${safeId}`);
    }
  };

  const updateMessageStatus = async (id: string, status: ContactMessage['status']) => {
    if (!user || !isAdmin) throw new Error('Admin authorization required.');
    try {
      await updateDoc(doc(db, 'messages', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${id}`);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!user || !isAdmin) throw new Error('Admin authorization required.');
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
    }
  };

  const value: EditorialContextValue = {
    user,
    userProfile,
    authReady,
    isAdmin,
    loadingArticles,
    loadingThoughts,
    publishedArticles,
    allArticles,
    categories,
    thoughts,
    subscribers,
    messages,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resendVerificationEmail,
    refreshUserSession,
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
