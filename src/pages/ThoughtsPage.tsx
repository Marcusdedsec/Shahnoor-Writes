import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Feather, Send, Trash2, UserPlus } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { CommunityThought } from '../types/editorial';
import { ChinarLeafMark, ManuscriptDivider } from '../components/KashmiriOrnaments';

const THOUGHT_THEMES = [
  'Reflection',
  'Poetry',
  'Memory',
  'Kashmir',
  'Observation',
  'Philosophy',
];

export const ThoughtsPage: React.FC = () => {
  const {
    user,
    userProfile,
    isAdmin,
    thoughts,
    loadingThoughts,
    saveThought,
    deleteThought,
  } = useEditorial();

  const [selectedTheme, setSelectedTheme] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('Reflection');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Community Thoughts — SHAHNOOR Writes';
  }, []);

  const filteredThoughts = useMemo(() => {
    if (selectedTheme === 'All') return thoughts;
    return thoughts.filter((t) => t.theme === selectedTheme);
  }, [thoughts, selectedTheme]);

  const resetForm = () => {
    setEditingId(undefined);
    setTitle('');
    setTheme('Reflection');
    setBody('');
  };

  const startEdit = (item: CommunityThought) => {
    setEditingId(item.id);
    setTitle(item.title);
    setTheme(item.theme);
    setBody(item.body);
    setErrorMsg(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNotice(null);
    setSaving(true);
    try {
      await saveThought({
        id: editingId,
        title,
        theme,
        body,
      });
      setNotice(editingId ? 'Your thought has been updated.' : 'Your thought has been shared.');
      resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to share your thought.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    try {
      await deleteThought(id);
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete thought.');
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <header className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs tracking-[0.2em] uppercase text-[#9C443B] font-medium mb-3">
          Reader Circle
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-4">
          Shared Thoughts &amp; Notes
        </h1>
        <p className="font-editorial text-base text-[#493528]/80 leading-relaxed">
          An open margin where everyone can post their feelings, share reflections, voice observations, and write whatever lives on their mind alongside SHAHNOOR Writes.
        </p>
      </header>

      {/* Compose Area or Account Invitation */}
      <section className="mb-14">
        {!user ? (
          <div className="ivory-surface border border-[#493528]/18 p-7 sm:p-9 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl font-medium text-[#25231F] mb-1.5">
                Have a thought to share?
              </h2>
              <p className="font-editorial text-sm text-[#493528]/80">
                Create an account with your email or sign in to publish your own reflections here.
              </p>
            </div>
            <Link
              to="/account"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Join / Sign In
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="ivory-surface border border-[#493528]/20 p-6 sm:p-8 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Feather className="w-4 h-4 text-[#9C443B]" />
                <h2 className="font-display text-2xl font-medium text-[#25231F]">
                  {editingId ? 'Edit Your Thought' : 'Share a Thought'}
                </h2>
              </div>
              <span className="text-xs text-[#493528]/75">
                Posting as{' '}
                <strong className="font-medium text-[#25231F]">
                  {userProfile?.displayName || user.displayName || user.email}
                </strong>
              </span>
            </div>

            {notice && (
              <div className="p-3.5 bg-[#485B47]/10 border border-[#485B47]/30 text-xs text-[#485B47]">
                {notice}
              </div>
            )}
            {errorMsg && (
              <div role="alert" className="p-3.5 bg-[#9C443B]/10 border border-[#9C443B]/30 text-xs text-[#9C443B]">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="thought-title"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Title
                </label>
                <input
                  id="thought-title"
                  type="text"
                  required
                  maxLength={140}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A brief headline for your reflection..."
                  className="w-full px-4 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>
              <div>
                <label
                  htmlFor="thought-theme"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Theme
                </label>
                <select
                  id="thought-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                >
                  {THOUGHT_THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="thought-body"
                className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
              >
                Your Reflection
              </label>
              <textarea
                id="thought-body"
                rows={4}
                required
                maxLength={8000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a paragraph, memory, or observation..."
                className="w-full px-4 py-3 font-editorial text-base leading-relaxed bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#493528]/60 tabular-nums">
                {body.length.toLocaleString()} / 8,000 chars
              </span>
              <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs text-[#493528] hover:text-[#25231F] cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  {saving ? 'Sharing...' : editingId ? 'Update Thought' : 'Publish Thought'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Theme Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 pb-5 border-b border-[#493528]/14 mb-8">
        {['All', ...THOUGHT_THEMES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSelectedTheme(item)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              selectedTheme === item
                ? 'bg-[#493528] text-[#F2EBDD]'
                : 'text-[#493528]/80 hover:text-[#9C443B]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Thoughts Feed */}
      {loadingThoughts ? (
        <div className="py-16 text-center font-display italic text-2xl text-[#493528]/70">
          Gathering reader thoughts...
        </div>
      ) : filteredThoughts.length === 0 ? (
        <div className="p-14 text-center border border-[#493528]/14 bg-[#E9DFC9]/30">
          <ChinarLeafMark className="w-7 h-7 text-[#9C443B]/75 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-medium text-[#25231F] mb-2">
            No thoughts shared here yet
          </h2>
          <p className="font-editorial text-sm text-[#493528]/80 max-w-md mx-auto">
            {selectedTheme === 'All'
              ? 'This page is open for readers and writers to contribute their first reflection.'
              : `No thoughts tagged under ${selectedTheme} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredThoughts.map((item) => {
            const canModify =
              Boolean(user) && (item.authorId === user?.uid || isAdmin);
            const dateStr = item.createdAtMillis
              ? new Date(item.createdAtMillis).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '';

            return (
              <article
                key={item.id}
                className="ivory-surface border border-[#493528]/16 p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75">
                    <span className="text-[#9C443B] font-medium uppercase tracking-wider">
                      {item.theme}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#25231F] font-medium">{item.authorName}</span>
                    {dateStr && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{dateStr}</span>
                      </>
                    )}
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#493528] hover:text-[#9C443B] cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      {confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="px-2.5 py-1 text-xs bg-[#9C443B] text-[#F2EBDD] cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs text-[#493528] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#9C443B]/80 hover:text-[#9C443B] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F] mb-3">
                  {item.title}
                </h3>
                <p className="font-editorial text-base leading-[1.78] text-[#25231F]/90 whitespace-pre-wrap">
                  {item.body}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <ManuscriptDivider className="mt-16" />
    </main>
  );
};
