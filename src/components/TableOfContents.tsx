import React, { useEffect, useMemo, useState } from 'react';
import { List, X } from 'lucide-react';
import { TocHeading, extractHeadings } from '../utils/editorialUtils';

interface TableOfContentsProps {
  content: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;
    setActiveId(headings[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-88px 0px -65% 0px',
        threshold: 0,
      },
    );

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const scrollToHeading = (heading: TocHeading) => {
    const target = document.getElementById(heading.id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(heading.id);
    }
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Sticky Margin Sidebar */}
      <aside
        aria-label="Table of Contents"
        className="hidden lg:block sticky top-28 self-start"
      >
        <div className="border-t border-[#493528]/18 pt-5">
          <p className="text-[11px] tracking-[0.18em] uppercase font-medium text-[#9C443B] mb-4">
            In This Essay
          </p>
          <nav>
            <ol className="space-y-2.5">
              {headings.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <li
                    key={item.id}
                    className={item.level === 3 ? 'pl-3.5' : ''}
                  >
                    <button
                      type="button"
                      onClick={() => scrollToHeading(item)}
                      className={`group text-left w-full flex items-start gap-2 text-[13px] leading-snug transition-colors cursor-pointer ${
                        isActive
                          ? 'text-[#9C443B] font-medium'
                          : 'text-[#493528]/72 hover:text-[#25231F]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 w-1.5 h-1.5 rotate-45 shrink-0 transition-colors ${
                          isActive
                            ? 'bg-[#B59A65]'
                            : 'bg-[#493528]/20 group-hover:bg-[#493528]/50'
                        }`}
                      />
                      <span className={item.level === 2 ? 'font-display text-[15px]' : 'font-editorial text-xs'}>
                        {item.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </aside>

      {/* Mobile & Tablet Floating Menu Trigger + Popover */}
      <div className="lg:hidden fixed bottom-5 right-5 z-40">
        {mobileOpen && (
          <div
            role="dialog"
            aria-label="Table of Contents"
            className="mb-3 w-72 max-w-[calc(100vw-2.5rem)] max-h-[60vh] overflow-y-auto ivory-surface border border-[#493528]/25 shadow-lg p-5"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#493528]/15">
              <span className="text-[11px] tracking-[0.18em] uppercase font-medium text-[#9C443B]">
                In This Essay
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close contents"
                className="p-1 text-[#493528]/70 hover:text-[#25231F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav>
              <ol className="space-y-2.5">
                {headings.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <li
                      key={item.id}
                      className={item.level === 3 ? 'pl-3.5' : ''}
                    >
                      <button
                        type="button"
                        onClick={() => scrollToHeading(item)}
                        className={`text-left w-full flex items-start gap-2 text-sm leading-snug cursor-pointer ${
                          isActive
                            ? 'text-[#9C443B] font-medium'
                            : 'text-[#493528]/80 hover:text-[#25231F]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 w-1.5 h-1.5 rotate-45 shrink-0 ${
                            isActive ? 'bg-[#B59A65]' : 'bg-[#493528]/25'
                          }`}
                        />
                        <span className={item.level === 2 ? 'font-display text-base' : 'font-editorial text-xs'}>
                          {item.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label="Toggle table of contents"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase bg-[#493528] text-[#F2EBDD] border border-[#B59A65]/40 shadow-md hover:bg-[#9C443B] transition-colors cursor-pointer"
        >
          <List className="w-3.5 h-3.5 text-[#B59A65]" />
          Contents
        </button>
      </div>
    </>
  );
};
