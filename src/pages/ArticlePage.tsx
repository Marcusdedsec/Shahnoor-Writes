import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Feather, Link2, Mail, Send, Share2, Trash2 } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { ArticleReflection } from '../types/editorial';
import {
  calculateReadingTime,
  countWords,
  extractHeadings,
  formatEditorialDate,
  slugify,
} from '../utils/editorialUtils';
import { EditorialImage } from '../components/EditorialImage';
import { ManuscriptDivider, PinjrakariCorner } from '../components/KashmiriOrnaments';
import { RichContentRenderer } from '../components/RichContentRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { NewsletterSection } from '../components/NewsletterSection';

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    publishedArticles,
    allArticles,
    isAdmin,
    user,
    subscribeArticleReflections,
    addArticleReflection,
    deleteArticleReflection,
  } = useEditorial();
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const proseEndRef = useRef<HTMLDivElement | null>(null);

  const [reflections, setReflections] = useState<ArticleReflection[]>([]);
  const [reflectionBody, setReflectionBody] = useState('');
  const [postingReflection, setPostingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  const pool = isAdmin ? allArticles : publishedArticles;
  const article = pool.find((a) => a.slug === slug || a.id === slug);

  const { wordCount, estimatedMinutes, hasToc } = useMemo(() => {
    const text = article?.content ?? '';
    return {
      wordCount: countWords(text),
      estimatedMinutes: calculateReadingTime(text),
      hasToc: extractHeadings(text).length > 0,
    };
  }, [article?.content]);

  const orderedPublished = publishedArticles;
  const currentIndex = orderedPublished.findIndex((a) => a.slug === slug || a.id === slug);
  const prevArticle = currentIndex > 0 ? orderedPublished[currentIndex - 1] : undefined;
  const nextArticle =
    currentIndex >= 0 && currentIndex < orderedPublished.length - 1
      ? orderedPublished[currentIndex + 1]
      : undefined;

  const relatedArticles = orderedPublished
    .filter((a) => a.id !== article?.id)
    .sort((a, b) => {
      const aMatch = a.category === article?.category ? 1 : 0;
      const bMatch = b.category === article?.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 3);

  // SEO metadata update
  useEffect(() => {
    if (!article) return;
    document.title = article.seoTitle || `${article.title} — SHAHNOOR Writes`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', article.seoDescription || article.excerpt);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [article]);

  // Subscribe to reader reflections for published articles
  useEffect(() => {
    if (!article || article.status !== 'published') {
      setReflections([]);
      return;
    }
    const unsub = subscribeArticleReflections(article.id, setReflections);
    return () => unsub();
  }, [article, subscribeArticleReflections]);

  const handlePostReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;
    setReflectionError(null);
    setPostingReflection(true);
    try {
      await addArticleReflection(article.id, reflectionBody);
      setReflectionBody('');
    } catch (err) {
      setReflectionError(
        err instanceof Error ? err.message : 'Unable to post your reflection.',
      );
    } finally {
      setPostingReflection(false);
    }
  };

  // Accurate reading progress indicator calibrated to the long-form article prose
  useEffect(() => {
    let rafId = 0;

    const computeProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxDocScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      let targetEnd = maxDocScroll;
      if (proseEndRef.current) {
        const endRect = proseEndRef.current.getBoundingClientRect();
        const proseEndDocY = endRect.top + scrollTop;
        const comfortableFinishY = proseEndDocY - window.innerHeight * 0.72;
        if (comfortableFinishY > 120) {
          targetEnd = Math.min(maxDocScroll, comfortableFinishY);
        }
      }

      if (targetEnd <= 0) {
        setProgress(0);
        return;
      }

      const ratio = Math.min(1, Math.max(0, scrollTop / targetEnd));
      setProgress(ratio);
    };

    const onScrollOrResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(computeProgress);
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    computeProgress();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [slug, article?.content]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard fallback unavailable
    }
  };

  if (!article) {
    return (
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-[#9C443B] mb-3">
          Archive Notice
        </p>
        <h1 className="font-display text-4xl text-[#25231F] mb-4">
          This manuscript could not be found
        </h1>
        <p className="font-editorial text-base text-[#493528]/80 mb-8">
          The essay you are looking for may have been moved, unpublished, or removed from the archive.
        </p>
        <Link
          to="/writings"
          className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium tracking-[0.08em] uppercase bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to All Writings
        </Link>
      </main>
    );
  }

  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(`${article.title} — SHAHNOOR Writes`);

  return (
    <main>
      {/* Reading Progress Hairline */}
      <div
        role="progressbar"
        aria-label="Article reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="fixed top-16 left-0 right-0 h-[2.5px] z-40 bg-[#493528]/10 pointer-events-none"
      >
        <div
          className="h-full w-full bg-gradient-to-r from-[#B59A65] via-[#9C443B] to-[#9C443B] origin-left will-change-transform shadow-[0_0_6px_rgba(156,68,59,0.28)]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <article className="pt-10 sm:pt-16 pb-16">
        {/* Article Header */}
        <header className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-[#493528]/75 mb-6">
            <Link to="/writings" className="hover:text-[#9C443B] transition-colors">
              All Writings
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              to={`/category/${slugify(article.category)}`}
              className="text-[#9C443B] font-medium hover:underline"
            >
              {article.category}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{formatEditorialDate(article.publishDate)}</span>
            {article.status !== 'published' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="uppercase tracking-wider font-medium text-[#9C443B]">
                  {article.status}
                </span>
              </>
            )}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.08] text-[#25231F] mb-6">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="font-display italic text-xl sm:text-2xl leading-snug text-[#493528]/90 max-w-2xl mx-auto mb-8">
              {article.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs tracking-[0.16em] uppercase text-[#493528]/75 mb-10">
            <span>
              By <span className="text-[#25231F] font-medium">{article.authorName}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[#9C443B] font-medium">
              {estimatedMinutes} {estimatedMinutes === 1 ? 'min' : 'mins'} to read
            </span>
            {wordCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {wordCount.toLocaleString()} words
                </span>
              </>
            )}
          </div>
        </header>

        {/* Cover Image Plate */}
        {article.coverImage && (
          <figure className="max-w-5xl mx-auto px-5 sm:px-8 mb-14">
            <div className="relative p-3 sm:p-4 bg-[#E9DFC9]/65 border border-[#493528]/18">
              <PinjrakariCorner className="w-6 h-6 text-[#B59A65]/80 absolute top-1.5 left-1.5 pointer-events-none" />
              <PinjrakariCorner className="w-6 h-6 text-[#B59A65]/80 absolute bottom-1.5 right-1.5 rotate-180 pointer-events-none" />
              <EditorialImage
                src={article.coverImage}
                alt={article.title}
                aspectClass="aspect-[16/9]"
                priority
              />
            </div>
            {article.coverCaption && (
              <figcaption className="mt-3 text-xs font-editorial italic text-[#493528]/75 text-center">
                {article.coverCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* Ideal-Measure Reading Column + Table of Contents */}
        <div
          className={
            hasToc
              ? 'max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start'
              : 'max-w-[68ch] mx-auto px-5 sm:px-8'
          }
        >
          {hasToc && (
            <div className="lg:col-span-3">
              <TableOfContents content={article.content} />
            </div>
          )}

          <div className={hasToc ? 'lg:col-span-9 max-w-[68ch] w-full' : ''}>
            <RichContentRenderer content={article.content} enableDropCap />
            <div ref={proseEndRef} className="h-px w-full" aria-hidden="true" />

          {/* Tags & Share Strip */}
          <div className="mt-14 pt-8 border-t border-[#493528]/18 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75">
              <span className="uppercase tracking-[0.12em] text-[#493528]/60 mr-1">
                Themes:
              </span>
              {article.tags.length > 0 ? (
                article.tags.map((tag, idx) => (
                  <React.Fragment key={tag}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <Link
                      to={`/writings?tag=${encodeURIComponent(tag)}`}
                      className="hover:text-[#9C443B] transition-colors"
                    >
                      {tag}
                    </Link>
                  </React.Fragment>
                ))
              ) : (
                <span>{article.category}</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#485B47]" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? 'Link Copied' : 'Copy Link'}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on X"
                className="inline-flex items-center justify-center w-9 h-9 border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </a>
              <a
                href={`mailto:?subject=${shareTitle}&body=${shareUrl}`}
                aria-label="Share via Email"
                className="inline-flex items-center justify-center w-9 h-9 border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Previous / Next Navigation */}
          {(prevArticle || nextArticle) && (
            <nav
              aria-label="Article Pagination"
              className="mt-12 pt-8 border-t border-[#493528]/18 grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              <div>
                {prevArticle && (
                  <Link
                    to={`/writings/${prevArticle.slug}`}
                    className="group block p-4 bg-[#E9DFC9]/35 border border-[#493528]/12 hover:border-[#9C443B]/40 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#493528]/65 mb-1.5">
                      <ArrowLeft className="w-3 h-3" />
                      Previous Essay
                    </span>
                    <p className="font-display text-lg font-medium text-[#25231F] group-hover:text-[#9C443B] transition-colors">
                      {prevArticle.title}
                    </p>
                  </Link>
                )}
              </div>
              <div className="sm:text-right">
                {nextArticle && (
                  <Link
                    to={`/writings/${nextArticle.slug}`}
                    className="group block p-4 bg-[#E9DFC9]/35 border border-[#493528]/12 hover:border-[#9C443B]/40 transition-colors"
                  >
                    <span className="inline-flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#493528]/65 mb-1.5">
                      Next Essay
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <p className="font-display text-lg font-medium text-[#25231F] group-hover:text-[#9C443B] transition-colors">
                      {nextArticle.title}
                    </p>
                  </Link>
                )}
                </div>
              </nav>
            )}
          </div>
        </div>
      </article>

      {/* Reader Reflections */}
      {article.status === 'published' && (
        <section className="max-w-[68ch] mx-auto px-5 sm:px-8 pb-14">
          <div className="pt-10 border-t border-[#493528]/18">
            <div className="flex items-center gap-2 mb-2">
              <Feather className="w-4 h-4 text-[#9C443B]" />
              <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium">
                Margin Notes
              </p>
            </div>
            <h2 className="font-display text-3xl font-medium text-[#25231F] mb-6">
              Reader Reflections
            </h2>

            {!user ? (
              <div className="p-5 bg-[#E9DFC9]/45 border border-[#493528]/16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <p className="font-editorial text-sm text-[#493528]/85">
                  Join or sign in with your email and password to leave a reflection on this essay.
                </p>
                <Link
                  to="/account"
                  className="px-4 py-2 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors shrink-0 text-center"
                >
                  Join / Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handlePostReflection} className="mb-8 space-y-3">
                {reflectionError && (
                  <div role="alert" className="p-3 bg-[#9C443B]/10 border border-[#9C443B]/30 text-xs text-[#9C443B]">
                    {reflectionError}
                  </div>
                )}
                <textarea
                  rows={3}
                  maxLength={2000}
                  required
                  value={reflectionBody}
                  onChange={(e) => setReflectionBody(e.target.value)}
                  placeholder="Share a quiet thought or response to this writing..."
                  className="w-full px-4 py-3 font-editorial text-sm leading-relaxed bg-[#E9DFC9]/45 border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#493528]/65 tabular-nums">
                    {reflectionBody.length} / 2,000
                  </span>
                  <button
                    type="submit"
                    disabled={postingReflection}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {postingReflection ? 'Posting...' : 'Post Reflection'}
                  </button>
                </div>
              </form>
            )}

            {reflections.length === 0 ? (
              <p className="font-editorial italic text-sm text-[#493528]/70">
                No reflections added yet.
              </p>
            ) : (
              <div className="space-y-4">
                {reflections.map((refItem) => {
                  const canRemove =
                    Boolean(user) && (refItem.authorId === user?.uid || isAdmin);
                  const dateLabel = refItem.createdAtMillis
                    ? new Date(refItem.createdAtMillis).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '';
                  return (
                    <div
                      key={refItem.id}
                      className="p-5 bg-[#E9DFC9]/35 border border-[#493528]/14"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#493528]/75 mb-2">
                        <div>
                          <span className="font-medium text-[#25231F]">
                            {refItem.authorName}
                          </span>
                          {dateLabel && (
                            <>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{dateLabel}</span>
                            </>
                          )}
                        </div>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() =>
                              void deleteArticleReflection(article.id, refItem.id)
                            }
                            aria-label="Delete reflection"
                            className="inline-flex items-center gap-1 text-[#9C443B]/80 hover:text-[#9C443B] cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="font-editorial text-sm leading-relaxed text-[#25231F]/90 whitespace-pre-wrap">
                        {refItem.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <ManuscriptDivider />
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-2">
            Continue Reading
          </p>
          <h2 className="font-display text-3xl font-medium text-[#25231F] mb-10">
            Related Writings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedArticles.map((item) => (
              <article key={item.id} className="group flex flex-col">
                <Link
                  to={`/writings/${item.slug}`}
                  className="block overflow-hidden border border-[#493528]/12 mb-4"
                >
                  <EditorialImage
                    src={item.coverImage}
                    alt={item.title}
                    aspectClass="aspect-[4/3]"
                    className="group-hover:scale-[1.015] transition-transform duration-700"
                  />
                </Link>
                <div className="flex items-center gap-2 text-xs text-[#493528]/75 mb-2">
                  <span className="text-[#9C443B] font-medium">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{item.readingTimeMinutes} min read</span>
                </div>
                <h3 className="font-display text-2xl font-medium text-[#25231F] leading-snug mb-2">
                  <Link
                    to={`/writings/${item.slug}`}
                    className="hover:text-[#9C443B] transition-colors"
                  >
                    {item.title}
                  </Link>
                </h3>
                <p className="font-editorial text-sm text-[#493528]/80 line-clamp-2">
                  {item.excerpt}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <NewsletterSection />
    </main>
  );
};
