import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Download,
  ExternalLink,
  FolderPlus,
  Inbox,
  LogOut,
  Mail,
  PenSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { Article } from '../types/editorial';
import { formatAuthError } from '../utils/authError';
import { formatEditorialDate } from '../utils/editorialUtils';
import { ArticleEditor } from '../components/ArticleEditor';
import { ChinarLeafMark, ManuscriptDivider } from '../components/KashmiriOrnaments';

type StudioTab = 'articles' | 'categories' | 'letters' | 'subscribers';

export const AdminPage: React.FC = () => {
  const {
    user,
    authReady,
    authorConfig,
    authorConfigLoaded,
    isAdmin,
    allArticles,
    categories,
    subscribers,
    messages,
    createAuthorProfile,
    signInWithEmail,
    signOutUser,
    deleteArticle,
    addCategory,
    deleteCategory,
    updateMessageStatus,
    deleteMessage,
  } = useEditorial();

  const [tab, setTab] = useState<StudioTab>('articles');
  const [editingArticle, setEditingArticle] = useState<Article | null | 'new'>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Author authentication form state
  const [authMode, setAuthMode] = useState<'create' | 'signin'>('create');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorPassword, setAuthorPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatAccent, setNewCatAccent] = useState('#9C443B');

  useEffect(() => {
    document.title = 'Author Studio — SHAHNOOR Writes';
  }, []);

  useEffect(() => {
    if (authorConfigLoaded) {
      setAuthMode(authorConfig ? 'signin' : 'create');
    }
  }, [authorConfigLoaded, authorConfig]);

  const handleAuthorAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (!authorConfig && authMode === 'create') {
        await createAuthorProfile({
          displayName: authorName,
          email: authorEmail,
          password: authorPassword,
        });
      } else {
        await signInWithEmail(authorEmail, authorPassword);
      }
      setAuthorPassword('');
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authReady || !authorConfigLoaded) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="font-display italic text-2xl text-[#493528]">
          Opening Author Studio...
        </p>
      </main>
    );
  }

  if (!user) {
    const canCreateProfile = !authorConfig;

    return (
      <main className="max-w-xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <div className="ivory-surface border border-[#493528]/20 p-8 sm:p-11">
          <div className="text-center mb-7">
            <ChinarLeafMark className="w-8 h-8 text-[#9C443B] mx-auto mb-4" />
            <p className="text-xs tracking-[0.2em] uppercase text-[#9C443B] font-medium mb-2">
              Author Studio
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#25231F] mb-3">
              {canCreateProfile && authMode === 'create'
                ? 'Create Author Profile'
                : 'Author Sign In'}
            </h1>
            <p className="font-editorial text-sm leading-relaxed text-[#493528]/80">
              {canCreateProfile
                ? 'Set up your personal author profile with your name, email, and password to publish stories and use the Writing Assistant.'
                : `Sign in with your author email and password to access ${authorConfig.displayName}’s publishing desk.`}
            </p>
          </div>

          {canCreateProfile && (
            <div className="grid grid-cols-2 border border-[#493528]/20 bg-[#F2EBDD] p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('create');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                  authMode === 'create' ? 'bg-[#493528] text-[#F2EBDD]' : 'text-[#493528]'
                }`}
              >
                Create Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                  authMode === 'signin' ? 'bg-[#493528] text-[#F2EBDD]' : 'text-[#493528]'
                }`}
              >
                Sign In
              </button>
            </div>
          )}

          {authError && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-[#9C443B]/10 border border-[#9C443B]/30 text-xs text-[#9C443B]"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthorAuthSubmit} className="space-y-4">
            {canCreateProfile && authMode === 'create' && (
              <div>
                <label
                  htmlFor="author-name"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Author Name
                </label>
                <input
                  id="author-name"
                  type="text"
                  required
                  maxLength={80}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Shahnoor"
                  className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="author-email"
                className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
              >
                Email
              </label>
              <input
                id="author-email"
                type="email"
                required
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="author@example.com"
                className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
              />
            </div>

            <div>
              <label
                htmlFor="author-password"
                className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
              >
                Password
              </label>
              <input
                id="author-password"
                type="password"
                required
                minLength={6}
                value={authorPassword}
                onChange={(e) => setAuthorPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
              />
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-3.5 text-xs font-medium uppercase tracking-[0.12em] bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer disabled:opacity-60"
            >
              {authBusy
                ? 'Please wait...'
                : canCreateProfile && authMode === 'create'
                  ? 'Create Author Profile & Enter Studio'
                  : 'Sign In to Author Studio'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="max-w-xl mx-auto px-5 sm:px-8 py-20">
        <div className="ivory-surface border border-[#493528]/20 p-8 sm:p-12 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-[#9C443B] font-medium mb-2">
            Author Access Required
          </p>
          <h1 className="font-display text-3xl font-medium text-[#25231F] mb-4">
            {!authorConfig ? 'Set Up the Author Profile' : 'Author Sign-In Required'}
          </h1>
          <p className="font-editorial text-sm leading-relaxed text-[#493528]/85 mb-6">
            You are currently signed in as{' '}
            <span className="font-medium text-[#25231F]">{user.email}</span>.{' '}
            {!authorConfig
              ? 'Sign out to create the Author Profile with your name, email, and password.'
              : `Author Studio is managed by ${authorConfig.displayName}. Please sign out and sign in with the author email and password.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="px-6 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer"
            >
              {!authorConfig ? 'Sign Out & Create Author Profile' : 'Sign Out'}
            </button>
            <Link
              to="/account"
              className="px-5 py-2.5 text-xs font-medium uppercase tracking-wider border border-[#493528]/30 text-[#493528] hover:border-[#9C443B]"
            >
              Back to Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (editingArticle !== null) {
    return (
      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <ArticleEditor
          initialArticle={editingArticle === 'new' ? null : editingArticle}
          onSaved={() => {
            setEditingArticle(null);
            setNotice('Manuscript saved to your archive.');
          }}
          onCancel={() => setEditingArticle(null)}
        />
      </main>
    );
  }

  const visibleArticles = allArticles.filter(
    (a) => filterStatus === 'all' || a.status === filterStatus,
  );
  const unreadMessages = messages.filter((m) => m.status === 'unread').length;

  const handleDeleteArticle = async (id: string) => {
    setBusyAction(true);
    try {
      await deleteArticle(id);
      setConfirmDeleteId(null);
      setNotice('Article permanently deleted.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setBusyAction(true);
    try {
      await addCategory({
        name: newCatName,
        description: newCatDesc,
        accent: newCatAccent,
      });
      setNewCatName('');
      setNewCatDesc('');
      setNotice('Section added.');
    } finally {
      setBusyAction(false);
    }
  };

  const exportSubscribersCsv = () => {
    const rows = ['email,subscribed_at'];
    subscribers.forEach((s) => {
      rows.push(`${s.email},${new Date(s.createdAtMillis).toISOString()}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shahnoor-writes-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      {/* Studio Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#493528]/18 mb-8">
        <div>
          <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-2">
            Author Studio
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#25231F]">
            SHAHNOOR Writes — Editorial Desk
          </h1>
          <p className="text-xs text-[#493528]/75 mt-1">
            Signed in as {user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingArticle('new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Story / Essay
          </button>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {notice && (
        <div className="mb-6 px-4 py-3 bg-[#485B47]/10 border border-[#485B47]/30 flex items-center justify-between text-xs text-[#485B47]">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-[#493528]/14 pb-4">
        <button
          type="button"
          onClick={() => setTab('articles')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer ${
            tab === 'articles' ? 'bg-[#493528] text-[#F2EBDD]' : 'bg-[#E9DFC9]/60 text-[#493528]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Writings ({allArticles.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer ${
            tab === 'categories' ? 'bg-[#493528] text-[#F2EBDD]' : 'bg-[#E9DFC9]/60 text-[#493528]'
          }`}
        >
          <FolderPlus className="w-3.5 h-3.5" />
          Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('letters')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer ${
            tab === 'letters' ? 'bg-[#493528] text-[#F2EBDD]' : 'bg-[#E9DFC9]/60 text-[#493528]'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Reader Letters ({unreadMessages > 0 ? `${unreadMessages} unread` : messages.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('subscribers')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer ${
            tab === 'subscribers' ? 'bg-[#493528] text-[#F2EBDD]' : 'bg-[#E9DFC9]/60 text-[#493528]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Subscribers ({subscribers.length})
        </button>
      </div>

      {/* TAB: ARTICLES */}
      {tab === 'articles' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'published', 'draft', 'scheduled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium capitalize cursor-pointer ${
                  filterStatus === s
                    ? 'bg-[#493528] text-[#F2EBDD]'
                    : 'bg-[#E9DFC9]/55 text-[#493528]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {visibleArticles.length === 0 ? (
            <div className="p-14 text-center border border-[#493528]/16 bg-[#E9DFC9]/35">
              <ChinarLeafMark className="w-7 h-7 text-[#9C443B]/75 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-medium text-[#25231F] mb-2">
                Your editorial desk is clean and ready
              </h2>
              <p className="font-editorial text-sm text-[#493528]/80 max-w-md mx-auto mb-6">
                {filterStatus === 'all'
                  ? 'Begin writing your first story, essay, or reflection whenever inspiration arrives.'
                  : `No ${filterStatus} writings found.`}
              </p>
              {filterStatus === 'all' && (
                <button
                  type="button"
                  onClick={() => setEditingArticle('new')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Write Your First Story
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#493528]/14 border border-[#493528]/16 bg-[#E9DFC9]/30">
              {visibleArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-1">
                      <span
                        className={`font-medium uppercase tracking-wider ${
                          article.status === 'published'
                            ? 'text-[#485B47]'
                            : article.status === 'scheduled'
                              ? 'text-[#B59A65]'
                              : 'text-[#9C443B]'
                        }`}
                      >
                        {article.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{article.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatEditorialDate(article.publishDate)}</span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-medium text-[#25231F] truncate">
                      {article.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      to={`/writings/${article.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#493528]/25 text-[#493528] hover:border-[#493528]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingArticle(article)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    {confirmDeleteId === article.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() => handleDeleteArticle(article.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-[#9C443B] text-[#F2EBDD] cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs text-[#493528] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(article.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-[#9C443B]/35 text-[#9C443B] hover:bg-[#9C443B] hover:text-[#F2EBDD] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 p-6 bg-[#E9DFC9]/55 border border-[#493528]/16">
            <h2 className="font-display text-2xl font-medium text-[#25231F] mb-4">
              Add New Section
            </h2>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#493528]/75 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Travelogues"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/20"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#493528]/75 mb-1">
                  Editorial Description
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description of this section's literary scope..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/20"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#493528]/75 mb-1">
                  Accent Tone
                </label>
                <select
                  value={newCatAccent}
                  onChange={(e) => setNewCatAccent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/20"
                >
                  <option value="#9C443B">Chinar Red (#9C443B)</option>
                  <option value="#485B47">Forest Green (#485B47)</option>
                  <option value="#493528">Deep Walnut (#493528)</option>
                  <option value="#B59A65">Aged Gold (#B59A65)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={busyAction}
                className="px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer"
              >
                Create Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 divide-y divide-[#493528]/14 border border-[#493528]/16 bg-[#E9DFC9]/30">
            {categories.map((cat) => (
              <div key={cat.slug} className="p-5 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: cat.accent }}>
                    /category/{cat.slug}
                  </span>
                  <h3 className="font-display text-2xl font-medium text-[#25231F] mt-0.5">
                    {cat.name}
                  </h3>
                  <p className="font-editorial text-xs text-[#493528]/80 mt-1">
                    {cat.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteCategory(cat.id)}
                  className="px-3 py-1.5 text-xs text-[#9C443B] border border-[#9C443B]/30 hover:bg-[#9C443B] hover:text-[#F2EBDD] transition-colors shrink-0 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: READER LETTERS */}
      {tab === 'letters' && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="p-12 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
              <p className="font-display italic text-2xl text-[#493528]">
                No letters have arrived in your inbox yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#493528]/15 border border-[#493528]/16 bg-[#E9DFC9]/35">
              {messages.map((msg) => (
                <div key={msg.id} className="p-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-[#9C443B] mr-2">
                        {msg.status}
                      </span>
                      <span className="font-display text-xl font-medium text-[#25231F]">
                        {msg.subject}
                      </span>
                      <p className="text-xs text-[#493528]/75 mt-0.5">
                        From {msg.name} ({msg.email}) · {new Date(msg.createdAtMillis).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.status === 'unread' && (
                        <button
                          type="button"
                          onClick={() => void updateMessageStatus(msg.id, 'read')}
                          className="px-3 py-1.5 text-xs bg-[#493528] text-[#F2EBDD] cursor-pointer"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteMessage(msg.id)}
                        className="px-3 py-1.5 text-xs border border-[#9C443B]/35 text-[#9C443B] cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="font-editorial text-sm leading-relaxed text-[#25231F]/90 whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SUBSCRIBERS */}
      {tab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#493528]/80 tabular-nums">
              {subscribers.length} {subscribers.length === 1 ? 'reader' : 'readers'} subscribed to the dispatch.
            </p>
            {subscribers.length > 0 && (
              <button
                type="button"
                onClick={exportSubscribersCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>

          {subscribers.length === 0 ? (
            <div className="p-12 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
              <p className="font-display italic text-2xl text-[#493528]">
                No newsletter subscribers recorded yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#493528]/14 border border-[#493528]/16 bg-[#E9DFC9]/35">
              {subscribers.map((sub) => (
                <div key={sub.id} className="px-5 py-3.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#25231F]">{sub.email}</span>
                  <span className="text-xs text-[#493528]/70 tabular-nums">
                    {new Date(sub.createdAtMillis).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ManuscriptDivider className="mt-16" />
    </main>
  );
};
