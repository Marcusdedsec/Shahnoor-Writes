import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AUTHOR_ILLUSTRATION_IMAGE } from '../data/sampleArticles';
import { EditorialImage } from '../components/EditorialImage';
import {
  ChinarLeafMark,
  ManuscriptDivider,
  PinjrakariCorner,
} from '../components/KashmiriOrnaments';
import { NewsletterSection } from '../components/NewsletterSection';

export const AboutPage: React.FC = () => {
  useEffect(() => {
    document.title = 'About — SHAHNOOR Writes';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <main>
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="relative p-3 sm:p-4 bg-[#E9DFC9]/75 border border-[#493528]/18">
              <PinjrakariCorner className="w-7 h-7 text-[#B59A65] absolute top-1.5 left-1.5 pointer-events-none" />
              <PinjrakariCorner className="w-7 h-7 text-[#B59A65] absolute bottom-1.5 right-1.5 rotate-180 pointer-events-none" />
              <EditorialImage
                src={AUTHOR_ILLUSTRATION_IMAGE}
                alt="Editorial illustration of a Kashmiri lattice window, handmade notebook, inkwell, reed pen, and Chinar leaves"
                aspectClass="aspect-[3/4]"
                priority
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-4 text-[#9C443B]">
              <ChinarLeafMark className="w-5 h-5" />
              <span className="text-xs tracking-[0.2em] uppercase font-medium">
                SHAHNOOR Writes
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#25231F] leading-[1.08] mb-8">
              Behind the Words
            </h1>

            <div className="border-y border-[#493528]/16 py-10 mb-10">
              <p className="font-editorial italic text-base sm:text-lg leading-[1.85] text-[#493528]/70">
                This space is reserved for the author&apos;s own biography and story.
              </p>
            </div>

            <ManuscriptDivider className="my-10" />

            <div className="flex flex-wrap items-center gap-6">
              <Link
                to="/writings"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium tracking-[0.08em] uppercase bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors"
              >
                Explore Writings
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/contact"
                className="editorial-link text-sm font-medium text-[#493528] hover:text-[#9C443B]"
              >
                Send a letter
              </Link>
            </div>
          </div>
        </div>
      </section>

      <NewsletterSection />
    </main>
  );
};
