import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { formatEditorialDate } from '../utils/editorialUtils';
import { EditorialImage } from '../components/EditorialImage';
import { ManuscriptDivider } from '../components/KashmiriOrnaments';

export const AllWritingsPage: React.FC = () => {
  const { publishedArticles, categories } = useEditorial();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTag = searchParams.get('tag') || '';
  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'shortest'>('newest');

  useEffect(() => {
    document.title = 'All Writings — SHAHNOOR Writes';
  }, []);

  useEffect(() => {
    const tagParam = searchParams.get('tag') || '';
    setSelectedTag(tagParam);
  }, [searchParams]);

  const filteredArticles = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const list = publishedArticles.filter((article) => {
      const catMatch =
        selectedCategory === 'All' ||
        article.category.toLowerCase() === selectedCategory.toLowerCase();
      const tagMatch =
        !selectedTag ||
        article.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      const queryMatch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.subtitle.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q) ||
        article.tags.some((t) => t.toLowerCase().includes(q)) ||
        article.content.toLowerCase().includes(q);
      return catMatch && tagMatch && queryMatch;
    });

    if (sortBy === 'oldest') {
      return [...list].sort((a, b) => a.publishDate.localeCompare(b.publishDate));
    }
    if (sortBy === 'shortest') {
      return [...list].sort((a, b) => a.readingTimeMinutes - b.readingTimeMinutes);
    }
    return [...list].sort((a, b) => b.publishDate.localeCompare(a.publishDate));
  }, [publishedArticles, queryText, selectedCategory, selectedTag, sortBy]);

  const clearTag = () => {
    setSelectedTag('');
    searchParams.delete('tag');
    setSearchParams(searchParams);
  };

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <header className="max-w-3xl mb-12">
        <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-3">
          The Complete Archive
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-4">
          All Writings
        </h1>
        <p className="font-editorial text-base leading-relaxed text-[#493528]/85">
          Essays, personal reflections, stories, and cultural meditations collected in chronological order.
        </p>
      </header>

      {/* Search & Filter Controls */}
      <div className="space-y-5 pb-8 border-b border-[#493528]/15 mb-12">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#493528]/55 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search essays, themes, or keywords..."
              aria-label="Search writings"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#E9DFC9]/55 border border-[#493528]/20 text-[#25231F] placeholder:text-[#493528]/50 focus:outline-none focus:border-[#9C443B]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="sort-select" className="text-xs text-[#493528]/70">
              Order:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'shortest')}
              className="px-3 py-2 text-xs font-medium bg-[#E9DFC9]/55 border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="shortest">Shortest Read</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'All'}
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-[#493528] text-[#F2EBDD]'
                : 'bg-[#E9DFC9]/60 text-[#493528] hover:bg-[#E9DFC9]'
            }`}
          >
            All Sections
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.name
                  ? 'bg-[#493528] text-[#F2EBDD]'
                  : 'bg-[#E9DFC9]/60 text-[#493528] hover:bg-[#E9DFC9]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {selectedTag && (
          <div className="flex items-center gap-2 text-xs text-[#493528]">
            <span>Filtering by theme:</span>
            <span className="font-medium text-[#9C443B]">{selectedTag}</span>
            <button
              type="button"
              onClick={clearTag}
              className="inline-flex items-center gap-1 px-2 py-1 border border-[#493528]/25 hover:border-[#9C443B] hover:text-[#9C443B] cursor-pointer"
            >
              Clear <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Article Results */}
      {publishedArticles.length === 0 ? (
        <div className="py-16 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
          <p className="font-display italic text-2xl text-[#493528] mb-3">
            No writings have been published yet.
          </p>
          <p className="font-editorial text-sm text-[#493528]/75 mb-6">
            New stories, essays, and reflections will appear here once published from the Author Studio.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors"
          >
            Open Author Studio
          </Link>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
          <p className="font-display italic text-2xl text-[#493528] mb-3">
            No writings matched your selection.
          </p>
          <button
            type="button"
            onClick={() => {
              setQueryText('');
              setSelectedCategory('All');
              clearTag();
            }}
            className="px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
          {filteredArticles.map((article) => (
            <article key={article.id} className="group flex flex-col">
              <Link
                to={`/writings/${article.slug}`}
                className="block overflow-hidden border border-[#493528]/14 mb-4"
              >
                <EditorialImage
                  src={article.coverImage}
                  alt={article.title}
                  aspectClass="aspect-[4/3]"
                  className="group-hover:scale-[1.015] transition-transform duration-700"
                />
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-2">
                <span className="text-[#9C443B] font-medium">{article.category}</span>
                <span aria-hidden="true">·</span>
                <span>{formatEditorialDate(article.publishDate)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{article.readingTimeMinutes} min read</span>
              </div>
              <h2 className="font-display text-2xl sm:text-[1.7rem] font-medium text-[#25231F] leading-snug mb-2.5">
                <Link
                  to={`/writings/${article.slug}`}
                  className="hover:text-[#9C443B] transition-colors"
                >
                  {article.title}
                </Link>
              </h2>
              <p className="font-editorial text-sm leading-relaxed text-[#493528]/85 line-clamp-3 mb-4">
                {article.excerpt}
              </p>
              <div className="mt-auto">
                <Link
                  to={`/writings/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.08em] uppercase text-[#9C443B] hover:text-[#25231F] transition-colors"
                >
                  Read article
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <ManuscriptDivider className="mt-20" />
    </main>
  );
};
