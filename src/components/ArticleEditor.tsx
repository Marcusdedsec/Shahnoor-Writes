import React, { useRef, useState } from 'react';
import {
  Bold,
  CalendarClock,
  Eye,
  Feather,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Save,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { CURATED_GALLERY_IMAGES } from '../data/sampleArticles';
import { Article, ArticleStatus } from '../types/editorial';
import {
  calculateReadingTime,
  compressImageFile,
  formatEditorialDate,
  isSafeUrl,
  slugify,
} from '../utils/editorialUtils';
import { EditorialAssistant } from './EditorialAssistant';
import { EditorialImage } from './EditorialImage';
import { RichContentRenderer } from './RichContentRenderer';

interface ArticleEditorProps {
  initialArticle?: Article | null;
  onSaved: (savedId: string) => void;
  onCancel: () => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  initialArticle,
  onSaved,
  onCancel,
}) => {
  const { categories, saveArticle } = useEditorial();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(initialArticle?.title ?? '');
  const [slug, setSlug] = useState(initialArticle?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initialArticle?.slug));
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle ?? '');
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt ?? '');
  const [content, setContent] = useState(initialArticle?.content ?? '');
  const [coverImage, setCoverImage] = useState(
    initialArticle?.coverImage ?? CURATED_GALLERY_IMAGES[0].url,
  );
  const [coverCaption, setCoverCaption] = useState(initialArticle?.coverCaption ?? '');
  const [category, setCategory] = useState(
    initialArticle?.category ?? categories[0]?.name ?? 'Essays',
  );
  const [tags, setTags] = useState<string[]>(initialArticle?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [featured, setFeatured] = useState(initialArticle?.featured ?? false);
  const [authorName, setAuthorName] = useState(initialArticle?.authorName ?? 'Shahnoor');
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status ?? 'draft');
  const [publishDate, setPublishDate] = useState(
    initialArticle?.publishDate ?? new Date().toISOString().slice(0, 16),
  );
  const [seoTitle, setSeoTitle] = useState(initialArticle?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(initialArticle?.seoDescription ?? '');

  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'assistant' | 'settings'>('assistant');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  // Inline insert helper popovers (no window.prompt!)
  const [insertPopover, setInsertPopover] = useState<'link' | 'image' | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [inlineImgUrl, setInlineImgUrl] = useState('');
  const [inlineImgCaption, setInlineImgCaption] = useState('');

  const readingTime = calculateReadingTime(content);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const insertAtCursor = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${before}${placeholder}${after}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + before.length + selected.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const syncSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    setSelectionRange({ start: el.selectionStart, end: el.selectionEnd });
  };

  const selectedText =
    selectionRange.end > selectionRange.start
      ? content.slice(selectionRange.start, selectionRange.end)
      : '';

  const applyAssistantProse = (
    prose: string,
    insertMode: 'append' | 'cursor' | 'replace',
  ) => {
    if (insertMode === 'replace') {
      if (selectionRange.end > selectionRange.start) {
        const next =
          content.slice(0, selectionRange.start) +
          prose +
          content.slice(selectionRange.end);
        setContent(next);
        setSelectionRange({
          start: selectionRange.start,
          end: selectionRange.start + prose.length,
        });
      } else {
        setContent(prose);
      }
    } else if (insertMode === 'append') {
      setContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${prose}` : prose));
    } else {
      insertAtCursor(`\n\n${prose}\n\n`);
    }
    setMode('write');
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setErrorMsg(null);
    try {
      const compressed = await compressImageFile(file, 1280);
      setCoverImage(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process cover image.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const compressed = await compressImageFile(file, 1080);
      setInlineImgUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process image.');
    } finally {
      e.target.value = '';
    }
  };

  const addTag = () => {
    const clean = tagInput.trim().slice(0, 40);
    if (!clean || tags.includes(clean) || tags.length >= 10) return;
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSafeUrl(linkUrl)) {
      setErrorMsg('Please enter a valid https:// or relative URL.');
      return;
    }
    insertAtCursor(`[${linkLabel.trim() || 'Read more'}](${linkUrl.trim()})`);
    setLinkLabel('');
    setLinkUrl('');
    setInsertPopover(null);
  };

  const handleInsertImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSafeUrl(inlineImgUrl)) {
      setErrorMsg('Please provide a valid image URL or upload an image file.');
      return;
    }
    insertAtCursor(`\n\n![${inlineImgCaption.trim()}](${inlineImgUrl.trim()})\n\n`);
    setInlineImgUrl('');
    setInlineImgCaption('');
    setInsertPopover(null);
  };

  const submitWithStatus = async (targetStatus: ArticleStatus) => {
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Please provide an editorial headline before saving.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Please write the article body before saving.');
      return;
    }
    const finalSlug = slugify(slug || title);
    if (!finalSlug) {
      setErrorMsg('Please enter a valid URL slug.');
      return;
    }

    setSaving(true);
    try {
      const savedId = await saveArticle({
        id: initialArticle?.id,
        slug: finalSlug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        excerpt: excerpt.trim() || content.replace(/[#>*`_\-\[\]()!]/g, '').trim().slice(0, 180),
        content,
        coverImage: coverImage.trim(),
        coverCaption: coverCaption.trim(),
        category,
        tags,
        status: targetStatus,
        featured,
        isSample: initialArticle?.isSample ?? false,
        authorName: authorName.trim() || 'Shahnoor',
        readingTimeMinutes: readingTime,
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        publishDate: publishDate || new Date().toISOString().slice(0, 10),
      });
      setStatus(targetStatus);
      onSaved(savedId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save article.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#493528]/18">
        <div>
          <p className="text-xs tracking-[0.16em] uppercase text-[#9C443B] font-medium mb-1">
            {initialArticle ? 'Editing Manuscript' : 'New Manuscript'}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F]">
            {title.trim() || 'Untitled Essay'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setMode('write');
              setSidebarTab((prev) => (prev === 'assistant' ? 'settings' : 'assistant'));
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer ${
              sidebarTab === 'assistant'
                ? 'bg-[#485B47] border-[#485B47] text-[#F2EBDD]'
                : 'border-[#B59A65] bg-[#E9DFC9]/70 text-[#493528] hover:border-[#9C443B]'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            Writing Assistant
          </button>

          <div className="flex items-center border border-[#493528]/25 bg-[#E9DFC9]/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer ${
                mode === 'write' ? 'bg-[#493528] text-[#F2EBDD]' : 'text-[#493528]'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              Compose
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer ${
                mode === 'preview' ? 'bg-[#493528] text-[#F2EBDD]' : 'text-[#493528]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('draft')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#493528]/30 text-[#493528] hover:border-[#493528] transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('scheduled')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#B59A65] text-[#493528] bg-[#E9DFC9]/70 hover:bg-[#E9DFC9] transition-colors cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Schedule
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitWithStatus('published')}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Publish'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs text-[#493528]/70 hover:text-[#25231F] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 bg-[#9C443B]/10 border border-[#9C443B]/30 text-sm text-[#9C443B]">
          {errorMsg}
        </div>
      )}

      {mode === 'preview' ? (
        /* LIVE LITERARY PREVIEW */
        <div className="bg-[#F2EBDD] border border-[#493528]/20 p-6 sm:p-12">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#493528]/75 mb-4">
              <span className="text-[#9C443B] font-medium">{category}</span>
              <span>·</span>
              <span>{formatEditorialDate(publishDate)}</span>
              <span>·</span>
              <span className="tabular-nums">{readingTime} min read</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-4">
              {title || 'Untitled Essay'}
            </h1>
            {subtitle && (
              <p className="font-display italic text-xl text-[#493528]/90 mb-4">{subtitle}</p>
            )}
            <p className="text-xs uppercase tracking-[0.16em] text-[#493528]/70">
              By {authorName || 'Shahnoor'}
            </p>
          </div>

          {coverImage && (
            <figure className="max-w-4xl mx-auto mb-12">
              <EditorialImage src={coverImage} alt={title || 'Cover preview'} aspectClass="aspect-[16/9]" />
              {coverCaption && (
                <figcaption className="mt-2.5 text-xs font-editorial italic text-[#493528]/75 text-center">
                  {coverCaption}
                </figcaption>
              )}
            </figure>
          )}

          <div className="max-w-[68ch] mx-auto">
            <RichContentRenderer content={content || 'Begin writing in the Compose view to preview your essay here.'} />
          </div>
        </div>
      ) : (
        /* COMPOSE WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Writing Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 bg-[#E9DFC9]/45 border border-[#493528]/16 space-y-5">
              <div>
                <label htmlFor="ed-title" className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5">
                  Headline
                </label>
                <input
                  id="ed-title"
                  type="text"
                  maxLength={180}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="The Poetry of Things Left Unsaid"
                  className="w-full px-4 py-3 font-display text-2xl sm:text-3xl bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>

              <div>
                <label htmlFor="ed-subtitle" className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5">
                  Subtitle / Deck
                </label>
                <input
                  id="ed-subtitle"
                  type="text"
                  maxLength={280}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="A short literary line framing the essay..."
                  className="w-full px-4 py-2.5 font-display italic text-lg bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>

              <div>
                <label htmlFor="ed-excerpt" className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5">
                  Excerpt
                </label>
                <textarea
                  id="ed-excerpt"
                  rows={2}
                  maxLength={500}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Two sentences summarizing the essay for the homepage and archive..."
                  className="w-full px-4 py-2.5 text-sm font-editorial bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>
            </div>

            {/* Rich Formatting Toolbar + Manuscript Area */}
            <div className="bg-[#E9DFC9]/45 border border-[#493528]/16">
              <div className="flex flex-wrap items-center gap-1 p-2.5 border-b border-[#493528]/15 bg-[#E9DFC9]/80">
                <button
                  type="button"
                  title="Heading 2"
                  onClick={() => insertAtCursor('\n## ', '\n', 'Section Heading')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Heading 3"
                  onClick={() => insertAtCursor('\n### ', '\n', 'Subheading')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
                <span className="w-px h-5 bg-[#493528]/15 mx-1" />
                <button
                  type="button"
                  title="Bold"
                  onClick={() => insertAtCursor('**', '**', 'bold text')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => insertAtCursor('*', '*', 'italic text')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <span className="w-px h-5 bg-[#493528]/15 mx-1" />
                <button
                  type="button"
                  title="Blockquote"
                  onClick={() => insertAtCursor('\n> ', '\n', 'Quoted reflection')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Pull Quote"
                  onClick={() => insertAtCursor('\n>> ', '\n', 'Highlighted literary pull quote')}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Pull Quote
                </button>
                <span className="w-px h-5 bg-[#493528]/15 mx-1" />
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => insertAtCursor('\n- ', '\n', 'List item')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => insertAtCursor('\n1. ', '\n', 'First point')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Insert Link"
                  onClick={() => setInsertPopover(insertPopover === 'link' ? null : 'link')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Insert Image & Caption"
                  onClick={() => setInsertPopover(insertPopover === 'image' ? null : 'image')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Kashmiri Ornamental Divider"
                  onClick={() => insertAtCursor('\n\n---\n\n')}
                  className="p-2 text-[#493528] hover:bg-[#F2EBDD] hover:text-[#9C443B] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              {insertPopover === 'link' && (
                <form
                  onSubmit={handleInsertLink}
                  className="p-4 bg-[#F2EBDD] border-b border-[#493528]/15 flex flex-wrap items-end gap-3"
                >
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                      Link Text
                    </label>
                    <input
                      type="text"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Read the letter"
                      className="w-full px-3 py-1.5 text-xs bg-white/60 border border-[#493528]/25"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                      URL (https://)
                    </label>
                    <input
                      type="url"
                      required
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-xs bg-white/60 border border-[#493528]/25"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-[#493528] text-[#F2EBDD] cursor-pointer"
                  >
                    Insert Link
                  </button>
                </form>
              )}

              {insertPopover === 'image' && (
                <form
                  onSubmit={handleInsertImage}
                  className="p-4 bg-[#F2EBDD] border-b border-[#493528]/15 space-y-3"
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                        Image URL or Upload
                      </label>
                      <input
                        type="text"
                        required
                        value={inlineImgUrl}
                        onChange={(e) => setInlineImgUrl(e.target.value)}
                        placeholder="/src/assets/... or upload file"
                        className="w-full px-3 py-1.5 text-xs bg-white/60 border border-[#493528]/25"
                      />
                    </div>
                    <input
                      ref={inlineImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleInlineImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => inlineImageInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#493528]/30 text-[#493528] cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                        Figure Caption
                      </label>
                      <input
                        type="text"
                        value={inlineImgCaption}
                        onChange={(e) => setInlineImgCaption(e.target.value)}
                        placeholder="Fig. — Afternoon light in the study"
                        className="w-full px-3 py-1.5 text-xs bg-white/60 border border-[#493528]/25"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-medium bg-[#493528] text-[#F2EBDD] cursor-pointer"
                    >
                      Insert Image
                    </button>
                  </div>
                </form>
              )}

              <textarea
                ref={textareaRef}
                rows={20}
                maxLength={80000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={syncSelection}
                onKeyUp={syncSelection}
                onMouseUp={syncSelection}
                placeholder="Write your essay here... Use ## for headings, > for blockquotes, >> for centered pull quotes, --- for Kashmiri dividers."
                className="w-full p-5 sm:p-6 font-editorial text-base leading-[1.82] bg-[#F2EBDD] text-[#25231F] placeholder:text-[#493528]/45 focus:outline-none"
              />

              <div className="px-4 py-2.5 border-t border-[#493528]/15 flex items-center justify-between text-xs text-[#493528]/70 tabular-nums">
                <span>Estimated reading time: {readingTime} min</span>
                <span>{content.length.toLocaleString()} / 80,000 chars</span>
              </div>
            </div>
          </div>

          {/* Sidebar Controls: Writing Assistant & Settings */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            {/* Sidebar Mode Switcher */}
            <div className="grid grid-cols-2 border border-[#493528]/20 bg-[#E9DFC9]/65 p-1">
              <button
                type="button"
                onClick={() => setSidebarTab('assistant')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  sidebarTab === 'assistant'
                    ? 'bg-[#493528] text-[#F2EBDD]'
                    : 'text-[#493528] hover:text-[#9C443B]'
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                Writing Assistant
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('settings')}
                className={`py-2 text-xs font-medium cursor-pointer transition-colors ${
                  sidebarTab === 'settings'
                    ? 'bg-[#493528] text-[#F2EBDD]'
                    : 'text-[#493528] hover:text-[#9C443B]'
                }`}
              >
                Cover &amp; Settings
              </button>
            </div>

            {sidebarTab === 'assistant' ? (
              <EditorialAssistant
                draft={{
                  title,
                  subtitle,
                  excerpt,
                  content,
                  selectedText,
                  category,
                  tags,
                }}
                onInsertProse={applyAssistantProse}
                onApplyMetadata={(meta) => {
                  if (meta.title) handleTitleChange(meta.title);
                  if (meta.subtitle !== undefined) setSubtitle(meta.subtitle);
                  if (meta.excerpt !== undefined) setExcerpt(meta.excerpt);
                  if (meta.seoTitle !== undefined) setSeoTitle(meta.seoTitle);
                  if (meta.seoDescription !== undefined) setSeoDescription(meta.seoDescription);
                  if (meta.tags && meta.tags.length > 0) {
                    setTags(
                      meta.tags.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 10),
                    );
                  }
                }}
              />
            ) : (
              <div className="space-y-6">
            {/* Cover Image */}
            <div className="p-5 bg-[#E9DFC9]/55 border border-[#493528]/16 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#493528]">
                Cover Photograph
              </h3>

              <EditorialImage
                src={coverImage}
                alt={title || 'Cover image preview'}
                aspectClass="aspect-[4/3]"
                className="border border-[#493528]/15"
              />

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingCover ? 'Optimizing...' : 'Upload Image'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGalleryPicker((p) => !p)}
                  className="px-3 py-2 text-xs font-medium border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] cursor-pointer"
                >
                  Editorial Gallery
                </button>
              </div>

              {showGalleryPicker && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {CURATED_GALLERY_IMAGES.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => {
                        setCoverImage(img.url);
                        setShowGalleryPicker(false);
                      }}
                      className="text-left border border-[#493528]/20 hover:border-[#9C443B] overflow-hidden cursor-pointer"
                    >
                      <img src={img.url} alt={img.label} className="w-full h-16 object-cover" />
                      <span className="block p-1.5 text-[10px] truncate text-[#493528]">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Image URL (or uploaded data)
                </label>
                <input
                  type="text"
                  value={coverImage.startsWith('data:') ? '[Uploaded compressed photograph]' : coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Cover Figure Caption
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={coverCaption}
                  onChange={(e) => setCoverCaption(e.target.value)}
                  placeholder="Fig. 1 — Morning mist over Dal Lake"
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>
            </div>

            {/* Publishing & Taxonomy */}
            <div className="p-5 bg-[#E9DFC9]/55 border border-[#493528]/16 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#493528]">
                Publishing &amp; Section
              </h3>

              <div>
                <label htmlFor="ed-category" className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Category
                </label>
                <select
                  id="ed-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                >
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ed-date" className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Publish / Schedule Date &amp; Time
                </label>
                <input
                  id="ed-date"
                  type="datetime-local"
                  value={publishDate.length === 10 ? `${publishDate}T08:00` : publishDate.slice(0, 16)}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>

              <div>
                <label htmlFor="ed-author" className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Author Byline
                </label>
                <input
                  id="ed-author"
                  type="text"
                  maxLength={80}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-[#25231F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="accent-[#9C443B]"
                />
                Feature prominently on homepage
              </label>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Tags ({tags.length}/10)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag & press Enter"
                    className="flex-1 px-3 py-1.5 text-xs bg-[#F2EBDD] border border-[#493528]/20"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-1.5 text-xs bg-[#493528] text-[#F2EBDD] cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-[#F2EBDD] border border-[#493528]/20 text-[#493528] hover:border-[#9C443B] cursor-pointer"
                    >
                      {t} <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#493528]/70">
                Current state: <span className="font-medium capitalize text-[#25231F]">{status}</span>
              </p>
            </div>

            {/* SEO Metadata */}
            <div className="p-5 bg-[#E9DFC9]/55 border border-[#493528]/16 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#493528]">
                SEO &amp; URL Settings
              </h3>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="the-poetry-of-things-left-unsaid"
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  maxLength={180}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title ? `${title} — SHAHNOOR Writes` : 'Custom search title'}
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#493528]/70 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  maxLength={320}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder={excerpt || 'Concise summary for search engines...'}
                  className="w-full px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F]"
                />
              </div>

              {/* Search Snippet Preview */}
              <div className="p-3 bg-[#F2EBDD] border border-[#493528]/12">
                <p className="text-[10px] uppercase tracking-wider text-[#493528]/60 mb-1">
                  Search Preview
                </p>
                <p className="text-xs font-medium text-[#485B47] truncate">
                  shahnoorwrites.com/writings/{slug || 'essay-slug'}
                </p>
                <p className="text-sm font-medium text-[#25231F] truncate">
                  {seoTitle || title || 'Untitled Essay'}
                </p>
                <p className="text-xs text-[#493528]/75 line-clamp-2">
                  {seoDescription || excerpt || 'Add a meta description or excerpt.'}
                </p>
              </div>
            </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
