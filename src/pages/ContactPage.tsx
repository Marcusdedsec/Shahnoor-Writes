import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { ChinarLeafMark, ManuscriptDivider, PinjrakariCorner } from '../components/KashmiriOrnaments';

export const ContactPage: React.FC = () => {
  const { sendContactMessage } = useEditorial();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'Contact & Letters — SHAHNOOR Writes';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await sendContactMessage({ name, email, subject, message });
      setFeedback({
        type: 'success',
        text: 'Your letter has been received with gratitude. Thank you for taking the time to write.',
      });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send your letter right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
      <header className="text-center max-w-2xl mx-auto mb-12">
        <div className="flex items-center justify-center gap-2.5 mb-3 text-[#9C443B]">
          <ChinarLeafMark className="w-5 h-5" />
          <span className="text-xs tracking-[0.2em] uppercase font-medium">
            Correspondence
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-4">
          Send a Letter
        </h1>
        <p className="font-editorial text-base leading-relaxed text-[#493528]/85">
          Whether you are writing in response to an essay, proposing a literary collaboration, or simply sharing a quiet thought, every thoughtful note is warmly read.
        </p>
      </header>

      <div className="relative ivory-surface border border-[#493528]/20 p-6 sm:p-12">
        <PinjrakariCorner className="w-7 h-7 text-[#B59A65] absolute top-2.5 left-2.5 pointer-events-none" />
        <PinjrakariCorner className="w-7 h-7 text-[#B59A65] absolute bottom-2.5 right-2.5 rotate-180 pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-xs font-medium tracking-[0.12em] uppercase text-[#493528]/80 mb-2"
              >
                Your Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amina Dar"
                className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/25 text-[#25231F] placeholder:text-[#493528]/45 focus:outline-none focus:border-[#9C443B]"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-xs font-medium tracking-[0.12em] uppercase text-[#493528]/80 mb-2"
              >
                Email Address
              </label>
              <input
                id="contact-email"
                type="email"
                required
                maxLength={160}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/25 text-[#25231F] placeholder:text-[#493528]/45 focus:outline-none focus:border-[#9C443B]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="block text-xs font-medium tracking-[0.12em] uppercase text-[#493528]/80 mb-2"
            >
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              maxLength={180}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Reflections on an essay, editorial inquiry..."
              className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/25 text-[#25231F] placeholder:text-[#493528]/45 focus:outline-none focus:border-[#9C443B]"
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs font-medium tracking-[0.12em] uppercase text-[#493528]/80 mb-2"
            >
              Your Letter
            </label>
            <textarea
              id="contact-message"
              required
              rows={7}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write freely..."
              className="w-full px-4 py-3 text-sm font-editorial leading-relaxed bg-[#F2EBDD] border border-[#493528]/25 text-[#25231F] placeholder:text-[#493528]/45 focus:outline-none focus:border-[#9C443B]"
            />
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-4 text-sm font-editorial border ${
                feedback.type === 'success'
                  ? 'bg-[#485B47]/10 border-[#485B47]/30 text-[#485B47]'
                  : 'bg-[#9C443B]/10 border-[#9C443B]/30 text-[#9C443B]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2.5 px-7 py-3 text-xs font-medium tracking-[0.1em] uppercase bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Sending Letter...' : 'Send Letter'}
            </button>
          </div>
        </form>
      </div>

      <ManuscriptDivider className="mt-16" />
    </main>
  );
};
