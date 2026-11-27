import React from 'react';
import { Link } from 'react-router-dom';
import { ChinarLeafMark, SozniBorderPattern } from './KashmiriOrnaments';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="ivory-surface border-t border-[#493528]/15 mt-20">
      <SozniBorderPattern />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#493528]/15">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <ChinarLeafMark className="w-6 h-6 text-[#9C443B]" />
              <span className="font-display text-2xl font-semibold tracking-[0.06em] text-[#25231F]">
                SHAHNOOR Writes
              </span>
            </div>
            <p className="font-display italic text-xl text-[#493528] mb-4">
              Written with thought. Open to every feeling.
            </p>
            <p className="text-xs leading-relaxed text-[#493528]/75 max-w-sm">
              An independent digital literary journal and open community space where stories, essays, and everyone&apos;s honest feelings find a home.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-xs font-medium tracking-[0.14em] uppercase text-[#493528]/70 mb-4">
              Publication
            </h3>
            <ul className="space-y-2.5 text-sm text-[#25231F]/85">
              <li>
                <Link to="/" className="hover:text-[#9C443B] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/writings" className="hover:text-[#9C443B] transition-colors">
                  All Writings
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#9C443B] transition-colors">
                  About the Author
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#9C443B] transition-colors">
                  Contact &amp; Letters
                </Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-[#9C443B] transition-colors">
                  Search Archive
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xs font-medium tracking-[0.14em] uppercase text-[#493528]/70 mb-4">
              Sections
            </h3>
            <ul className="space-y-2.5 text-sm text-[#25231F]/85">
              <li>
                <Link to="/category/essays" className="hover:text-[#9C443B] transition-colors">
                  Essays
                </Link>
              </li>
              <li>
                <Link to="/category/personal-reflections" className="hover:text-[#9C443B] transition-colors">
                  Personal Reflections
                </Link>
              </li>
              <li>
                <Link to="/category/stories" className="hover:text-[#9C443B] transition-colors">
                  Stories
                </Link>
              </li>
              <li>
                <Link to="/category/culture" className="hover:text-[#9C443B] transition-colors">
                  Culture
                </Link>
              </li>
              <li>
                <Link to="/category/life-and-philosophy" className="hover:text-[#9C443B] transition-colors">
                  Life &amp; Philosophy
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xs font-medium tracking-[0.14em] uppercase text-[#493528]/70 mb-4">
              Connect
            </h3>
            <ul className="space-y-2.5 text-sm text-[#25231F]/85">
              <li>
                <Link to="/thoughts" className="hover:text-[#9C443B] transition-colors">
                  Shared Thoughts
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-[#9C443B] transition-colors">
                  Reader Account
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#9C443B] transition-colors">
                  Send a Letter
                </Link>
              </li>
              <li>
                <a
                  href="#newsletter"
                  className="hover:text-[#9C443B] transition-colors"
                >
                  Journal Dispatch
                </a>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[#9C443B] transition-colors">
                  Author Studio
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#493528]/75">
          <p>© {year} SHAHNOOR Writes. All rights reserved.</p>
          <p className="italic">Written with thought. Open to every feeling.</p>
        </div>
      </div>
    </footer>
  );
};
