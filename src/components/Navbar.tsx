import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'All Writings', to: '/writings' },
  { label: 'Essays', to: '/category/essays' },
  { label: 'Stories', to: '/category/stories' },
  { label: 'Thoughts', to: '/thoughts' },
  { label: 'About', to: '/about' },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useEditorial();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const primaryActionTo = isAdmin ? '/admin' : '/account';
  const primaryActionLabel = isAdmin ? 'Write' : user ? 'Account' : 'Join / Sign In';

  return (
    <header className="sticky top-0 z-40 bg-[#F2EBDD]/95 backdrop-blur-sm border-b border-[#493528]/14">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element editorial wordmark */}
        <Link
          to="/"
          className="font-display text-xl sm:text-2xl font-semibold tracking-[0.06em] text-[#25231F] whitespace-nowrap shrink-0 hover:text-[#9C443B] transition-colors"
        >
          SHAHNOOR Writes
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#493528]"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`editorial-link whitespace-nowrap shrink-0 py-1 transition-colors ${
                isActive(item.to)
                  ? 'text-[#9C443B]'
                  : 'text-[#493528]/85 hover:text-[#25231F]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: Search icon + primary account / writing action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/search')}
            aria-label="Search writings"
            className="w-10 h-10 flex items-center justify-center text-[#493528] hover:text-[#9C443B] transition-colors cursor-pointer"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={1.6} />
          </button>

          <Link
            to={primaryActionTo}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-medium tracking-wide border border-[#493528]/30 text-[#25231F] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors whitespace-nowrap shrink-0"
          >
            {primaryActionLabel}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden w-11 h-11 flex items-center justify-center text-[#25231F] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#F2EBDD] border-t border-[#493528]/14 px-6 py-6">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`py-3 text-base font-display tracking-wide border-b border-[#493528]/10 ${
                  isActive(item.to) ? 'text-[#9C443B] font-semibold' : 'text-[#25231F]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 flex items-center justify-between gap-4">
              <Link
                to="/account"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-[#493528] hover:text-[#9C443B]"
              >
                {user ? 'Reader Account' : 'Create Account / Sign In'}
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="px-5 py-2.5 text-xs font-medium tracking-wide bg-[#493528] text-[#F2EBDD]"
              >
                Author Studio
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
