import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { formatEditorialDate, slugify } from '../utils/editorialUtils';
import { EditorialImage } from '../components/EditorialImage';
import { ChinarLeafMark, ManuscriptDivider } from '../components/KashmiriOrnaments';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { publishedArticles, categories } = useEditorial();

  const category = categories.find(
    (c) => c.slug === slug || slugify(c.name) === slug,
  );

  const articles = publishedArticles.filter((a) =>
    category
      ? a.category.toLowerCase() === category.name.toLowerCase()
      : slugify(a.category) === slug,
  );

  const displayName = category?.name || (slug ? slug.replace(/-/g, ' ') : 'Section');

  useEffect(() => {
    document.title = `${displayName} — SHAHNOOR Writes`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [displayName]);

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <header className="max-w-3xl pb-10 border-b border-[#493528]/15 mb-12">
        <div className="flex items-center gap-2.5 mb-3">
          <ChinarLeafMark className="w-5 h-5 text-[#9C443B]" />
          <span
            className="text-xs tracking-[0.18em] uppercase font-medium"
            style={{ color: category?.accent || '#9C443B' }}
          >
            Editorial Section
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] capitalize mb-4">
          {displayName}
        </h1>
        <p className="font-editorial text-base leading-relaxed text-[#493528]/85">
          {category?.description ||
            `Selected essays and reflections filed under ${displayName}.`}
        </p>
      </header>

      {/* Switch between sections */}
      <div className="flex flex-wrap items-center gap-2 mb-12">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            to={`/category/${cat.slug}`}
            className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              cat.slug === category?.slug
                ? 'bg-[#493528] text-[#F2EBDD]'
                : 'bg-[#E9DFC9]/60 text-[#493528] hover:bg-[#E9DFC9]'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="py-16 text-center bg-[#E9DFC9]/40 border border-[#493528]/15">
          <p className="font-display italic text-2xl text-[#493528] mb-4">
            No entries have been filed in {displayName} yet.
          </p>
          <Link
            to="/writings"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD]"
          >
            Browse All Writings
          </Link>
        </div>
      ) : (
        <div className="space-y-12 divide-y divide-[#493528]/14">
          {articles.map((article) => (
            <article
              key={article.id}
              className="pt-10 first:pt-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              <Link
                to={`/writings/${article.slug}`}
                className="lg:col-span-5 block group overflow-hidden border border-[#493528]/14"
              >
                <EditorialImage
                  src={article.coverImage}
                  alt={article.title}
                  aspectClass="aspect-[4/3]"
                  className="group-hover:scale-[1.015] transition-transform duration-700"
                />
              </Link>
              <div className="lg:col-span-7">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-3">
                  <span className="text-[#9C443B] font-medium">{article.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatEditorialDate(article.publishDate)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{article.readingTimeMinutes} min read</span>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#25231F] leading-snug mb-3">
                  <Link
                    to={`/writings/${article.slug}`}
                    className="hover:text-[#9C443B] transition-colors"
                  >
                    {article.title}
                  </Link>
                </h2>
                {article.subtitle && (
                  <p className="font-display italic text-xl text-[#493528]/85 mb-3">
                    {article.subtitle}
                  </p>
                )}
                <p className="font-editorial text-sm sm:text-base leading-relaxed text-[#493528]/85 mb-5">
                  {article.excerpt}
                </p>
                <Link
                  to={`/writings/${article.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase text-[#9C443B] hover:text-[#25231F] transition-colors"
                >
                  Read Essay
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
