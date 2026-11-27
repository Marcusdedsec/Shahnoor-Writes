import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, Feather, PenLine } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { AUTHOR_ILLUSTRATION_IMAGE, HERO_KASHMIR_IMAGE } from '../data/sampleArticles';
import { formatEditorialDate } from '../utils/editorialUtils';
import { EditorialImage } from '../components/EditorialImage';
import {
  ChinarLeafMark,
  ManuscriptDivider,
  PinjrakariCorner,
} from '../components/KashmiriOrnaments';
import { NewsletterSection } from '../components/NewsletterSection';

export const HomePage: React.FC = () => {
  const { publishedArticles, categories, thoughts, loadingArticles, loadingThoughts } = useEditorial();

  useEffect(() => {
    document.title = 'SHAHNOOR Writes — Stories, Essays & Shared Feelings';
  }, []);

  const heroFeatured =
    publishedArticles.find((a) => a.featured) || publishedArticles[0];
  const secondaryFeatured =
    publishedArticles.find((a) => a.featured && a.id !== heroFeatured?.id) ||
    publishedArticles[1];

  const latestList = publishedArticles
    .filter((a) => a.id !== heroFeatured?.id)
    .slice(0, 5);

  const countByCategory = (catName: string) =>
    publishedArticles.filter(
      (a) => a.category.toLowerCase() === catName.toLowerCase(),
    ).length;

  return (
    <main>
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Editorial Lead Column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-between py-2"
          >
            <div>
              <div className="flex items-center gap-3 mb-6 text-[#9C443B]">
                <ChinarLeafMark className="w-6 h-6 shrink-0" />
                <span className="text-xs tracking-[0.2em] uppercase font-medium text-[#493528]/80">
                  Kashmiri Literary Journal
                </span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl xl:text-[4.25rem] font-medium leading-[1.03] tracking-tight text-[#25231F] mb-4">
                SHAHNOOR Writes
              </h1>

              <p className="font-display italic text-xl sm:text-2xl text-[#9C443B] leading-snug mb-4">
                Words, woven with thought—and an open page for every heart.
              </p>

              <p className="font-editorial text-base leading-[1.78] text-[#493528]/90 max-w-md mb-8">
                A sanctuary for stories, essays, reflections, and anything that deserves to be said—where everyone can create an account, post their feelings, share unspoken thoughts, and write whatever moves them.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/writings"
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-xs font-medium tracking-[0.08em] uppercase bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Writings
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/thoughts"
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs font-medium tracking-[0.08em] uppercase border border-[#493528]/35 text-[#25231F] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors whitespace-nowrap shrink-0"
                >
                  Share Your Feelings
                </Link>
              </div>
            </div>

            <div className="pt-12 hidden lg:flex items-center gap-3 text-xs tracking-[0.14em] uppercase text-[#493528]/65">
              <a
                href="#latest-writings"
                className="inline-flex items-center gap-2.5 hover:text-[#9C443B] transition-colors"
              >
                <span className="w-6 h-px bg-[#493528]/40" />
                <span>Scroll to read</span>
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </a>
            </div>
          </motion.div>

          {/* Hero Visual / Featured Article Column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col"
          >
            {heroFeatured ? (
              <article className="h-full flex flex-col bg-[#E9DFC9]/55 border border-[#493528]/15 p-4 sm:p-6">
                <Link
                  to={`/writings/${heroFeatured.slug}`}
                  className="block group overflow-hidden"
                >
                  <EditorialImage
                    src={heroFeatured.coverImage}
                    alt={heroFeatured.title}
                    aspectClass="aspect-[16/10]"
                    priority
                    className="group-hover:scale-[1.015] transition-transform duration-700"
                  />
                </Link>

                <div className="pt-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-2.5">
                      <span className="text-[#9C443B] font-medium">
                        {heroFeatured.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatEditorialDate(heroFeatured.publishDate)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {heroFeatured.readingTimeMinutes} min read
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F] leading-snug mb-2.5">
                      <Link
                        to={`/writings/${heroFeatured.slug}`}
                        className="hover:text-[#9C443B] transition-colors"
                      >
                        {heroFeatured.title}
                      </Link>
                    </h2>

                    <p className="font-editorial text-sm leading-relaxed text-[#493528]/85 line-clamp-2 mb-4">
                      {heroFeatured.excerpt}
                    </p>
                  </div>

                  <div>
                    <Link
                      to={`/writings/${heroFeatured.slug}`}
                      className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase text-[#9C443B] hover:text-[#25231F] transition-colors"
                    >
                      Read Featured Essay
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <div className="h-full flex flex-col bg-[#E9DFC9]/55 border border-[#493528]/15 p-4 sm:p-6">
                <EditorialImage
                  src={HERO_KASHMIR_IMAGE}
                  alt="Misty autumn dawn over Dal Lake in Kashmir"
                  aspectClass="aspect-[16/10]"
                  priority
                />
                <div className="pt-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs tracking-[0.16em] uppercase text-[#9C443B] font-medium mb-2">
                      {loadingArticles ? 'Opening Archive' : 'First Edition'}
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F] leading-snug mb-2">
                      {loadingArticles
                        ? 'Preparing the pages...'
                        : 'A quiet folio awaiting its opening chapter.'}
                    </h2>
                    <p className="font-editorial text-sm leading-relaxed text-[#493528]/80 mb-4">
                      New stories, essays, and reflections published by Shahnoor will grace this space.
                    </p>
                  </div>
                  <div>
                    <Link
                      to="/admin"
                      className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase text-[#9C443B] hover:text-[#25231F] transition-colors"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      Write First Story
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <ManuscriptDivider />
      </div>

      {/* FEATURED WRITING — ASYMMETRIC EDITORIAL SPREAD (when 2+ articles exist) */}
      {secondaryFeatured && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="flex items-baseline justify-between mb-10">
            <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium">
              Selected Folio
            </p>
            <Link
              to="/writings"
              className="editorial-link text-xs tracking-[0.1em] uppercase text-[#493528]/80 hover:text-[#9C443B]"
            >
              View Archive
            </Link>
          </div>

          <article className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-4">
                <span className="text-[#9C443B] font-medium">
                  {secondaryFeatured.category}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatEditorialDate(secondaryFeatured.publishDate)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {secondaryFeatured.readingTimeMinutes} min read
                </span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-medium leading-[1.12] text-[#25231F] mb-5">
                <Link
                  to={`/writings/${secondaryFeatured.slug}`}
                  className="hover:text-[#9C443B] transition-colors"
                >
                  {secondaryFeatured.title}
                </Link>
              </h2>

              {secondaryFeatured.subtitle && (
                <p className="font-display italic text-xl text-[#493528] leading-snug mb-4">
                  {secondaryFeatured.subtitle}
                </p>
              )}

              <p className="font-editorial text-[15px] leading-[1.8] text-[#493528]/88 mb-7">
                {secondaryFeatured.excerpt}
              </p>

              <Link
                to={`/writings/${secondaryFeatured.slug}`}
                className="inline-flex items-center gap-2.5 text-xs font-medium tracking-[0.1em] uppercase text-[#25231F] border-b border-[#493528]/35 pb-1 hover:border-[#9C443B] hover:text-[#9C443B] transition-colors"
              >
                Continue Reading
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="lg:col-span-7 order-1 lg:order-2">
              <Link
                to={`/writings/${secondaryFeatured.slug}`}
                className="block group overflow-hidden border border-[#493528]/15 p-2.5 bg-[#E9DFC9]/45"
              >
                <EditorialImage
                  src={secondaryFeatured.coverImage}
                  alt={secondaryFeatured.title}
                  aspectClass="aspect-[4/3]"
                  className="group-hover:scale-[1.015] transition-transform duration-700"
                />
              </Link>
            </div>
          </article>
        </section>
      )}

      {/* LATEST WRITINGS — EDITORIAL LISTING */}
      <section id="latest-writings" className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#493528]/15 mb-12">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-2">
              Recent Dispatches
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#25231F]">
              Latest Writings
            </h2>
          </div>
          {publishedArticles.length > 0 && (
            <Link
              to="/writings"
              className="editorial-link text-sm text-[#493528] hover:text-[#9C443B]"
            >
              Browse all {publishedArticles.length} {publishedArticles.length === 1 ? 'essay' : 'essays'}
            </Link>
          )}
        </div>

        {publishedArticles.length === 0 ? (
          <div className="py-16 px-6 text-center border border-[#493528]/15 bg-[#E9DFC9]/35">
            <ChinarLeafMark className="w-7 h-7 text-[#9C443B]/70 mx-auto mb-4" />
            <h3 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F] mb-2">
              No stories published yet
            </h3>
            <p className="font-editorial text-sm text-[#493528]/80 max-w-md mx-auto mb-6">
              This publication is freshly prepared. Once Shahnoor publishes her first story or reflection, it will appear right here.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors"
            >
              Open Author Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : latestList.length === 0 ? (
          <p className="font-editorial text-sm italic text-[#493528]/75">
            The inaugural essay is featured above. More writings forthcoming.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {latestList[0] && (
              <article className="lg:col-span-6 flex flex-col pb-8 lg:pb-0 lg:pr-6 lg:border-r border-[#493528]/12">
                <Link
                  to={`/writings/${latestList[0].slug}`}
                  className="block group overflow-hidden mb-5 border border-[#493528]/12"
                >
                  <EditorialImage
                    src={latestList[0].coverImage}
                    alt={latestList[0].title}
                    aspectClass="aspect-[4/3]"
                    className="group-hover:scale-[1.015] transition-transform duration-700"
                  />
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-2.5">
                  <span className="text-[#9C443B] font-medium">{latestList[0].category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatEditorialDate(latestList[0].publishDate)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{latestList[0].readingTimeMinutes} min read</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F] leading-snug mb-3">
                  <Link
                    to={`/writings/${latestList[0].slug}`}
                    className="hover:text-[#9C443B] transition-colors"
                  >
                    {latestList[0].title}
                  </Link>
                </h3>
                <p className="font-editorial text-sm leading-[1.8] text-[#493528]/85 mb-5">
                  {latestList[0].excerpt}
                </p>
                <div className="mt-auto">
                  <Link
                    to={`/writings/${latestList[0].slug}`}
                    className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase text-[#9C443B] hover:text-[#25231F] transition-colors"
                  >
                    Read article
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            )}

            <div className="lg:col-span-6 divide-y divide-[#493528]/14">
              {latestList.slice(1).map((article) => (
                <article
                  key={article.id}
                  className="py-6 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-12 gap-5 items-start"
                >
                  <Link
                    to={`/writings/${article.slug}`}
                    className="sm:col-span-4 block group overflow-hidden border border-[#493528]/12"
                  >
                    <EditorialImage
                      src={article.coverImage}
                      alt={article.title}
                      aspectClass="aspect-[4/3]"
                      className="group-hover:scale-[1.02] transition-transform duration-700"
                    />
                  </Link>
                  <div className="sm:col-span-8">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-1.5">
                      <span className="text-[#9C443B] font-medium">{article.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatEditorialDate(article.publishDate)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{article.readingTimeMinutes} min read</span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-medium text-[#25231F] leading-snug mb-2">
                      <Link
                        to={`/writings/${article.slug}`}
                        className="hover:text-[#9C443B] transition-colors"
                      >
                        {article.title}
                      </Link>
                    </h3>
                    <p className="font-editorial text-xs sm:text-sm leading-relaxed text-[#493528]/80 line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                    <Link
                      to={`/writings/${article.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#493528] hover:text-[#9C443B] transition-colors"
                    >
                      Read article
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* COMMUNITY POSTS — SHARED FEELINGS & THOUGHTS ON MAIN PAGE */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-18">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#493528]/15 mb-10">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-2">
              Reader Circle
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#25231F]">
              Shared Feelings &amp; Community Posts
            </h2>
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/thoughts"
              className="editorial-link text-sm text-[#493528] hover:text-[#9C443B]"
            >
              {thoughts.length > 0 ? `View all ${thoughts.length} posts` : 'Open Thoughts'}
            </Link>
            <Link
              to="/thoughts"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors"
            >
              <Feather className="w-3.5 h-3.5" />
              Post Your Thought
            </Link>
          </div>
        </div>

        {loadingThoughts ? (
          <p className="font-display italic text-xl text-[#493528]/70 py-8">
            Gathering shared thoughts...
          </p>
        ) : thoughts.length === 0 ? (
          <div className="py-12 px-6 text-center border border-[#493528]/15 bg-[#E9DFC9]/35">
            <Feather className="w-6 h-6 text-[#9C443B]/75 mx-auto mb-3" />
            <h3 className="font-display text-2xl font-medium text-[#25231F] mb-2">
              No community posts shared yet
            </h3>
            <p className="font-editorial text-sm text-[#493528]/80 max-w-md mx-auto mb-5">
              Every member who joins with an email and password can share their feelings, poetry, and reflections right here on the main page.
            </p>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors"
            >
              Join &amp; Share
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {thoughts.slice(0, 6).map((item) => {
              const dateStr = item.createdAtMillis
                ? new Date(item.createdAtMillis).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '';
              return (
                <article
                  key={item.id}
                  className="ivory-surface border border-[#493528]/16 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#493528]/75 mb-2.5">
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
                    <h3 className="font-display text-2xl font-medium text-[#25231F] leading-snug mb-2.5">
                      {item.title}
                    </h3>
                    <p className="font-editorial text-sm leading-[1.75] text-[#25231F]/85 line-clamp-4 whitespace-pre-wrap mb-4">
                      {item.body}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#493528]/10">
                    <Link
                      to="/thoughts"
                      className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.06em] uppercase text-[#9C443B] hover:text-[#25231F] transition-colors"
                    >
                      Read in Reader Circle
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* LITERARY QUOTE SECTION — ANTIQUE MANUSCRIPT FOLIO */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="relative ivory-surface border border-[#493528]/20 px-8 py-14 sm:px-16 sm:py-20 text-center">
          <PinjrakariCorner className="w-9 h-9 text-[#B59A65] absolute top-3 left-3" />
          <PinjrakariCorner className="w-9 h-9 text-[#B59A65] absolute top-3 right-3 rotate-90" />
          <PinjrakariCorner className="w-9 h-9 text-[#B59A65] absolute bottom-3 left-3 -rotate-90" />
          <PinjrakariCorner className="w-9 h-9 text-[#B59A65] absolute bottom-3 right-3 rotate-180" />

          <p className="text-xs tracking-[0.2em] uppercase text-[#493528]/65 mb-6">
            From the Margin
          </p>
          <blockquote className="font-display italic text-3xl sm:text-5xl leading-[1.22] text-[#25231F] max-w-2xl mx-auto mb-6">
            “Some thoughts are too beautiful to remain unwritten.”
          </blockquote>
          <ManuscriptDivider className="max-w-xs mx-auto my-6" />
          <p className="font-editorial text-xs tracking-wide text-[#493528]/75">
            SHAHNOOR Writes — Literary Notebooks
          </p>
        </div>
      </section>

      {/* EXPLORE BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="mb-10">
          <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-2">
            Chapters &amp; Themes
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#25231F]">
            Explore by Category
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, idx) => {
            const count = countByCategory(cat.name);
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group block p-7 bg-[#E9DFC9]/40 border border-[#493528]/14 hover:bg-[#E9DFC9]/75 hover:border-[#493528]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-xs font-medium tracking-[0.14em] uppercase"
                    style={{ color: cat.accent }}
                  >
                    0{idx + 1}. Section
                  </span>
                  <span className="text-xs text-[#493528]/65 tabular-nums">
                    {count} {count === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-medium text-[#25231F] group-hover:text-[#9C443B] transition-colors mb-2.5">
                  {cat.name}
                </h3>
                <p className="font-editorial text-sm leading-relaxed text-[#493528]/80 mb-5">
                  {cat.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#493528] group-hover:text-[#9C443B] transition-colors">
                  Read section
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ABOUT THE AUTHOR — BEHIND THE WORDS */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center border-t border-[#493528]/15 pt-16">
          <div className="lg:col-span-5">
            <div className="p-3 bg-[#E9DFC9]/70 border border-[#493528]/15 max-w-md mx-auto lg:mx-0">
              <EditorialImage
                src={AUTHOR_ILLUSTRATION_IMAGE}
                alt="Editorial illustration of a Kashmiri lattice window, handmade notebook, inkwell, reed pen, and Chinar leaves"
                aspectClass="aspect-[3/4]"
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-3">
              The Author
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-6">
              Behind the Words
            </h2>
            <div className="border-y border-[#493528]/14 py-8 mb-8 max-w-xl">
              <p className="font-editorial italic text-base leading-[1.82] text-[#493528]/70">
                Reserved for the author&apos;s own introduction.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium tracking-[0.08em] uppercase bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors"
              >
                About Page
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/contact"
                className="editorial-link text-sm text-[#493528] hover:text-[#9C443B]"
              >
                Send a letter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <NewsletterSection />
    </main>
  );
};
