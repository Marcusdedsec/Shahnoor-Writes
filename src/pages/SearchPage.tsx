import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { formatEditorialDate } from '../utils/editorialUtils';
import { EditorialImage } from '../components/EditorialImage';
import { ManuscriptDivider } from '../components/KashmiriOrnaments';

export const SearchPage: React.FC = () => {
  const { publishedArticles, categories } = useEditorial();
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    document.title = 'Search Archive — SHAHNOOR Writes';
  }, []);

  const results = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return publishedArticles;
    return publishedArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [publishedArticles, queryText]);

  const popularTags = useMemo(() => {
    const set = new Set<string>();
    publishedArticles.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 12);
  }, [publishedArticles]);

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
      <header className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-3">
          Index &amp; Discovery
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-6">
          Search the Archive
        </h1>

        <div className="relative">
          <Search className="w-5 h-5 text-[#493528]/55 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search by title, phrase, theme, or category..."
            aria-label="Search articles"
            className="w-full pl-12 pr-5 py-4 text-base bg-[#E9DFC9]/65 border border-[#493528]/25 text-[#25231F] placeholder:text-[#493528]/50 focus:outline-none focus:border-[#9C443B]"
          />
        </div>

        {popularTags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-[#493528]/75">
            <span className="text-[#493528]/55">Themes:</span>
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQueryText(tag)}
                className="px-2.5 py-1 bg-[#E9DFC9]/55 hover:bg-[#E9DFC9] text-[#493528] hover:text-[#9C443B] transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </header>

      <ManuscriptDivider className="mb-12" />

      <div className="mb-6 flex items-center justify-between text-xs text-[#493528]/75">
        <span className="tabular-nums">
          {results.length} {results.length === 1 ? 'essay' : 'essays'} found
        </span>
        {queryText && (
          <button
            type="button"
            onClick={() => setQueryText('')}
            className="text-[#9C443B] hover:underline cursor-pointer"
          >
            Clear search
          </button>
        )}
      </div>

      {publishedArticles.length === 0 ? (
        <div className="py-16 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
          <p className="font-display italic text-2xl text-[#493528] mb-3">
            The archive is awaiting its first published writings.
          </p>
          <p className="font-editorial text-sm text-[#493528]/75">
            Once stories and essays are published, every title, phrase, and tag will be searchable here.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
          <p className="font-display italic text-2xl text-[#493528] mb-3">
            No writings contain “{queryText}”.
          </p>
          <p className="font-editorial text-sm text-[#493528]/75 mb-6">
            Try another keyword or browse one of our literary sections below.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="px-4 py-2 text-xs bg-[#E9DFC9] text-[#493528] hover:text-[#9C443B]"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#493528]/15">
          {results.map((article) => (
            <article
              key={article.id}
              className="py-8 first:pt-0 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center"
            >
              <Link
                to={`/writings/${article.slug}`}
                className="sm:col-span-4 block overflow-hidden border border-[#493528]/12"
              >
                <EditorialImage
                  src={article.coverImage}
                  alt={article.title}
                  aspectClass="aspect-[4/3]"
                />
              </Link>
              <div className="sm:col-span-8">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-2">
                  <span className="text-[#9C443B] font-medium">{article.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatEditorialDate(article.publishDate)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{article.readingTimeMinutes} min read</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F] mb-2">
                  <Link
                    to={`/writings/${article.slug}`}
                    className="hover:text-[#9C443B] transition-colors"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="font-editorial text-sm leading-relaxed text-[#493528]/85 line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
                <Link
                  to={`/writings/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[#9C443B] hover:text-[#25231F]"
                >
                  Read Essay <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};
