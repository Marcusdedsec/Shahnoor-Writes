import React, { useState } from 'react';
import { useEditorial } from '../context/EditorialContext';
import { ManuscriptDivider } from './KashmiriOrnaments';

export const NewsletterSection: React.FC = () => {
  const { subscribeNewsletter } = useEditorial();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await subscribeNewsletter(email);
      setStatusMessage({
        type: 'success',
        text: 'Your address has been added to the dispatch ledger. Expect quiet, occasional letters.',
      });
      setEmail('');
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to record your subscription right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="newsletter" className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <div className="ivory-surface border border-[#493528]/18 px-6 py-12 sm:px-14 sm:py-16 text-center">
        <p className="text-xs tracking-[0.18em] uppercase text-[#9C443B] font-medium mb-3">
          Correspondence
        </p>
        <h2 className="font-display text-3xl sm:text-5xl text-[#25231F] mb-4">
          Letters worth waiting for.
        </h2>
        <p className="font-editorial text-sm sm:text-base text-[#493528]/85 max-w-xl mx-auto leading-relaxed mb-8">
          Occasional words, thoughtful stories, and new writings delivered to your inbox.
        </p>

        <ManuscriptDivider className="max-w-xs mx-auto mb-8" />

        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto flex flex-col sm:flex-row items-stretch gap-3"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="flex-1 px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/25 text-[#25231F] placeholder:text-[#493528]/50 focus:outline-none focus:border-[#9C443B]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 text-xs font-medium tracking-[0.08em] uppercase bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {submitting ? 'Recording...' : 'Subscribe'}
          </button>
        </form>

        {statusMessage && (
          <p
            role="status"
            className={`mt-4 text-xs font-editorial ${
              statusMessage.type === 'success' ? 'text-[#485B47]' : 'text-[#9C443B]'
            }`}
          >
            {statusMessage.text}
          </p>
        )}
      </div>
    </section>
  );
};
