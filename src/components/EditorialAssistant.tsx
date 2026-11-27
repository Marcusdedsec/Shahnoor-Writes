import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  FileCheck2,
  Feather,
  Lightbulb,
  ListTree,
  PlusCircle,
  Replace,
  Send,
  Sparkles,
  SpellCheck2,
  Tag,
  Wand2,
} from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';

export interface SuggestedMetadata {
  titleSuggestions: string[];
  subtitle: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}

export interface GrammarIssue {
  original: string;
  suggestion: string;
  reason: string;
}

export interface GrammarResult {
  summary: string;
  issues: GrammarIssue[];
  correctedText: string;
}

export interface CreativeSuggestionsResult {
  openingHooks: string[];
  imageryAndMotifs: string[];
  structuralAngles: string[];
  pullQuotes: string[];
}

interface EditorialAssistantProps {
  draft: {
    title: string;
    subtitle: string;
    excerpt: string;
    content: string;
    selectedText?: string;
    category: string;
    tags: string[];
  };
  onInsertProse: (text: string, mode: 'append' | 'cursor' | 'replace') => void;
  onApplyMetadata: (meta: {
    title?: string;
    subtitle?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    tags?: string[];
  }) => void;
}

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  insertable?: boolean;
  replaceable?: boolean;
  targetedSelection?: boolean;
  metadata?: SuggestedMetadata;
  grammar?: GrammarResult;
  suggestions?: CreativeSuggestionsResult;
}

export const EditorialAssistant: React.FC<EditorialAssistantProps> = ({
  draft,
  onInsertProse,
  onApplyMetadata,
}) => {
  const { user } = useEditorial();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Your Writing Assistant is ready. Highlight any passage in the manuscript—or leave nothing selected to review the full draft—then choose Refine Prose, Check Grammar, Creative Suggestions, or ask a question below.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const selectedWordCount = draft.selectedText?.trim()
    ? draft.selectedText.trim().split(/\s+/).length
    : 0;

  const callAssistant = async (
    mode:
      | 'chat'
      | 'outline'
      | 'refine'
      | 'grammar'
      | 'suggestions'
      | 'continue'
      | 'metadata'
      | 'review',
    customPrompt: string,
    userLabel: string,
  ) => {
    if (!user) {
      setErrorMsg('Please sign in with your verified owner account to use the Writing Assistant.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const hasSelection = Boolean(draft.selectedText?.trim());
    const userMsgId = `u-${Date.now()}`;
    const nextHistory = messages.map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: userLabel }]);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode,
          prompt: customPrompt,
          draft,
          history: nextHistory,
        }),
      });

      const data = (await response.json()) as {
        text?: string;
        metadata?: SuggestedMetadata;
        grammar?: GrammarResult;
        suggestions?: CreativeSuggestionsResult;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'The Writing Assistant could not respond.');
      }

      if (mode === 'metadata' && data.metadata) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: 'Here are headline options, a subtitle, excerpt, tags, and search metadata tailored to your draft:',
            metadata: data.metadata,
          },
        ]);
      } else if (mode === 'grammar' && data.grammar) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.grammar?.summary || 'Grammar & mechanics check complete.',
            grammar: data.grammar,
            targetedSelection: hasSelection,
          },
        ]);
      } else if (mode === 'suggestions' && data.suggestions) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: 'Creative possibilities drawn from your draft—click any item to insert it directly:',
            suggestions: data.suggestions,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: (data.text || '').trim() || 'No suggestion returned.',
            insertable:
              mode === 'outline' ||
              mode === 'continue' ||
              mode === 'refine' ||
              mode === 'chat',
            replaceable: mode === 'refine',
            targetedSelection: hasSelection,
          },
        ]);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to connect to the Writing Assistant.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    void callAssistant('chat', trimmed, trimmed);
  };

  const markApplied = (id: string) => {
    setAppliedId(id);
    setTimeout(() => setAppliedId(null), 1800);
  };

  return (
    <section
      aria-label="Writing Assistant"
      className="bg-[#F2EBDD] border border-[#493528]/20 flex flex-col max-h-[calc(100vh-9rem)]"
    >
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-[#493528]/16 bg-[#E9DFC9]/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Feather className="w-4 h-4 text-[#9C443B]" />
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#9C443B] font-medium">
              AI Editorial Aide
            </p>
            <h3 className="font-display text-lg font-medium text-[#25231F] leading-tight">
              Writing Assistant
            </h3>
          </div>
        </div>
        <span className="text-[10px] tracking-wider uppercase text-[#493528]/75">
          {selectedWordCount > 0 ? `${selectedWordCount}w selected` : 'Full draft'}
        </span>
      </div>

      {/* Primary Writing Tools */}
      <div className="px-4 py-3 border-b border-[#493528]/14 bg-[#E9DFC9]/35 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant(
                'refine',
                input.trim(),
                selectedWordCount > 0
                  ? `Refine highlighted passage (${selectedWordCount} words)`
                  : 'Refine prose rhythm & clarity',
              )
            }
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5 shrink-0" />
            <span>Refine Prose</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant(
                'grammar',
                input.trim(),
                selectedWordCount > 0
                  ? `Check grammar on highlighted passage`
                  : 'Check grammar & punctuation',
              )
            }
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium bg-[#485B47] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer disabled:opacity-50"
          >
            <SpellCheck2 className="w-3.5 h-3.5 shrink-0" />
            <span>Check Grammar</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant(
                'suggestions',
                input.trim(),
                input.trim()
                  ? `Creative suggestions: ${input.trim()}`
                  : 'Generate creative suggestions for draft',
              )
            }
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Lightbulb className="w-3.5 h-3.5 shrink-0" />
            <span>Suggestions</span>
          </button>
        </div>

        {/* Secondary Drafting & Publishing Tools */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant(
                'outline',
                input.trim(),
                input.trim() ? `Outline: ${input.trim()}` : 'Build a section outline',
              )
            }
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#F2EBDD] border border-[#493528]/20 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors cursor-pointer disabled:opacity-50"
          >
            <ListTree className="w-3 h-3" />
            Outline
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant('continue', input.trim(), 'Continue the manuscript')
            }
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#F2EBDD] border border-[#493528]/20 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            Continue
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant(
                'metadata',
                input.trim(),
                'Generate titles, excerpt, SEO & tags',
              )
            }
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#F2EBDD] border border-[#493528]/20 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Tag className="w-3 h-3" />
            Publish Kit
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void callAssistant('review', input.trim(), 'Pre-publish editorial review')
            }
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#F2EBDD] border border-[#493528]/20 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileCheck2 className="w-3 h-3" />
            Review
          </button>
        </div>
      </div>

      {/* Conversation & Results Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-[260px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'ml-6 p-2.5 bg-[#493528] text-[#F2EBDD] text-xs leading-relaxed'
                : 'mr-1 p-3 bg-[#E9DFC9]/55 border border-[#493528]/15 text-xs leading-relaxed text-[#25231F]'
            }
          >
            <p className="whitespace-pre-wrap font-editorial text-[13px] leading-[1.65]">
              {msg.text}
            </p>

            {/* Structured Grammar Audit Card */}
            {msg.grammar && (
              <div className="mt-3 pt-3 border-t border-[#493528]/15 space-y-2.5">
                {msg.grammar.issues.length === 0 ? (
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#485B47]">
                    <CheckCheck className="w-3.5 h-3.5" />
                    No grammar or punctuation errors detected.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {msg.grammar.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#F2EBDD] border border-[#493528]/14 text-[11px] space-y-1"
                      >
                        <p className="text-[#9C443B] line-through">{issue.original}</p>
                        <p className="text-[#485B47] font-medium">{issue.suggestion}</p>
                        <p className="text-[#493528]/75">{issue.reason}</p>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        onInsertProse(msg.grammar!.correctedText, 'replace');
                        markApplied(`${msg.id}-gram`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium uppercase tracking-wider bg-[#485B47] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer"
                    >
                      <Replace className="w-3.5 h-3.5" />
                      {appliedId === `${msg.id}-gram`
                        ? 'Fixes Applied'
                        : msg.targetedSelection
                          ? 'Apply Fixes to Selection'
                          : 'Apply Fixes to Manuscript'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Structured Creative Suggestions Card */}
            {msg.suggestions && (
              <div className="mt-3 pt-3 border-t border-[#493528]/15 space-y-3">
                {[
                  { label: 'Opening Hooks', items: msg.suggestions.openingHooks },
                  { label: 'Imagery & Motifs', items: msg.suggestions.imageryAndMotifs },
                  { label: 'Narrative Angles', items: msg.suggestions.structuralAngles },
                  { label: 'Pull Quotes', items: msg.suggestions.pullQuotes },
                ].map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.label} className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-[#493528]/70 font-medium">
                          {group.label}
                        </p>
                        {group.items.map((item, idx) => {
                          const key = `${msg.id}-${group.label}-${idx}`;
                          return (
                            <div
                              key={key}
                              className="p-2 bg-[#F2EBDD] border border-[#493528]/14 text-[11px] space-y-1.5"
                            >
                              <p className="font-editorial text-[12px] text-[#25231F]">
                                {item}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  onInsertProse(item, 'cursor');
                                  markApplied(key);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#9C443B] hover:text-[#493528] cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" />
                                {appliedId === key ? 'Inserted' : 'Insert at Cursor'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ),
                )}
              </div>
            )}

            {/* Structured Publish Kit Card */}
            {msg.metadata && (
              <div className="mt-3 pt-3 border-t border-[#493528]/15 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#493528]/70 mb-1.5">
                    Headline Options (Click to apply)
                  </p>
                  <div className="space-y-1.5">
                    {msg.metadata.titleSuggestions.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onApplyMetadata({ title: t });
                          markApplied(`${msg.id}-title-${i}`);
                        }}
                        className="w-full text-left px-2.5 py-1.5 bg-[#F2EBDD] border border-[#493528]/20 hover:border-[#9C443B] font-display text-sm text-[#25231F] transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span>{t}</span>
                        {appliedId === `${msg.id}-title-${i}` && (
                          <Check className="w-3.5 h-3.5 text-[#485B47] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-[#493528]">
                  <p>
                    <span className="font-semibold text-[#25231F]">Subtitle:</span>{' '}
                    {msg.metadata.subtitle}
                  </p>
                  <p>
                    <span className="font-semibold text-[#25231F]">Excerpt:</span>{' '}
                    {msg.metadata.excerpt}
                  </p>
                  <p>
                    <span className="font-semibold text-[#25231F]">SEO Title:</span>{' '}
                    {msg.metadata.seoTitle}
                  </p>
                  <p>
                    <span className="font-semibold text-[#25231F]">SEO Description:</span>{' '}
                    {msg.metadata.seoDescription}
                  </p>
                  <p>
                    <span className="font-semibold text-[#25231F]">Tags:</span>{' '}
                    {msg.metadata.tags.join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onApplyMetadata({
                      title: msg.metadata?.titleSuggestions?.[0],
                      subtitle: msg.metadata?.subtitle,
                      excerpt: msg.metadata?.excerpt,
                      seoTitle: msg.metadata?.seoTitle,
                      seoDescription: msg.metadata?.seoDescription,
                      tags: msg.metadata?.tags,
                    });
                    markApplied(`${msg.id}-all`);
                  }}
                  className="w-full py-2 text-[11px] font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer"
                >
                  {appliedId === `${msg.id}-all`
                    ? 'Applied to Manuscript'
                    : 'Apply All Metadata to Draft'}
                </button>
              </div>
            )}

            {/* Insert / Replace actions */}
            {msg.role === 'assistant' && msg.insertable && (
              <div className="mt-3 pt-2.5 border-t border-[#493528]/12 flex flex-wrap gap-1.5">
                {msg.replaceable && (
                  <button
                    type="button"
                    onClick={() => {
                      onInsertProse(msg.text, 'replace');
                      markApplied(`${msg.id}-rep`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] cursor-pointer"
                  >
                    <Replace className="w-3 h-3" />
                    {appliedId === `${msg.id}-rep`
                      ? 'Replaced'
                      : msg.targetedSelection
                        ? 'Replace Selection'
                        : 'Replace Draft'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onInsertProse(msg.text, 'cursor');
                    markApplied(`${msg.id}-cur`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] hover:text-[#9C443B] cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  {appliedId === `${msg.id}-cur` ? 'Inserted' : 'Insert at Cursor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInsertProse(msg.text, 'append');
                    markApplied(`${msg.id}-app`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  {appliedId === `${msg.id}-app` ? 'Appended' : 'Append'}
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-2 p-3 bg-[#E9DFC9]/45 border border-[#493528]/15 text-xs italic text-[#493528]">
            Reading your manuscript...
          </div>
        )}

        {errorMsg && (
          <div role="alert" className="p-3 bg-[#9C443B]/10 border border-[#9C443B]/30 text-xs text-[#9C443B]">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={handleSubmitChat}
        className="p-3 border-t border-[#493528]/16 bg-[#E9DFC9]/60 flex items-end gap-2"
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitChat(e);
            }
          }}
          placeholder="Ask for tone tweaks, metaphors, grammar checks, or ideas..."
          className="flex-1 px-3 py-2 text-xs bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F] placeholder:text-[#493528]/45 focus:outline-none focus:border-[#9C443B] resize-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message to Writing Assistant"
          className="p-2.5 bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer disabled:opacity-45"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
};
