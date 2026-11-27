import React from 'react';
import { extractHeadings, isSafeUrl } from '../utils/editorialUtils';
import { EditorialImage } from './EditorialImage';
import { ManuscriptDivider } from './KashmiriOrnaments';

interface RichContentRendererProps {
  content: string;
  enableDropCap?: boolean;
}

function renderInlineNodes(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-[#25231F]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const label = linkMatch[1];
        const href = linkMatch[2].trim();
        if (isSafeUrl(href)) {
          const external = href.startsWith('http://') || href.startsWith('https://');
          tokens.push(
            <a
              key={`a-${keyIdx++}`}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="text-[#9C443B] underline decoration-[#9C443B]/40 underline-offset-4 hover:decoration-[#9C443B] transition-colors"
            >
              {label}
            </a>,
          );
        } else {
          tokens.push(label);
        }
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

export const RichContentRenderer: React.FC<RichContentRendererProps> = ({
  content,
  enableDropCap = true,
}) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const extractedHeadings = extractHeadings(content);
  let headingCursor = 0;
  const elements: React.ReactNode[] = [];
  let i = 0;
  let dropCapApplied = false;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    // Horizontal divider
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      elements.push(<ManuscriptDivider key={`div-${i}`} className="my-10" />);
      i++;
      continue;
    }

    // Pull quote (>>)
    if (line.startsWith('>> ')) {
      const quoteLines: string[] = [line.slice(3).trim()];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>> ')) {
        quoteLines.push(lines[i].trim().slice(3).trim());
        i++;
      }
      elements.push(
        <aside key={`pq-${i}`} className="my-10 py-8 px-4 sm:px-8 border-y border-[#B59A65]/40 text-center">
          <p className="font-display italic text-2xl sm:text-3xl leading-[1.35] text-[#493528] text-balance">
            “{renderInlineNodes(quoteLines.join(' '))}”
          </p>
        </aside>,
      );
      continue;
    }

    // Standard blockquote (>)
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [line.slice(2).trim()];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2).trim());
        i++;
      }
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-8 py-6 px-7 bg-[#E9DFC9]/55 border border-[#493528]/12 font-display italic text-xl sm:text-2xl leading-[1.45] text-[#493528]"
        >
          {renderInlineNodes(quoteLines.join(' '))}
        </blockquote>,
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      const headingId = extractedHeadings[headingCursor]?.id;
      headingCursor++;
      elements.push(
        <h3
          key={`h3-${i}`}
          id={headingId}
          className="scroll-mt-24 font-display text-2xl sm:text-[1.75rem] font-medium text-[#25231F] mt-10 mb-4 leading-snug"
        >
          {renderInlineNodes(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      const headingText = line.startsWith('## ') ? line.slice(3) : line.slice(2);
      const headingId = extractedHeadings[headingCursor]?.id;
      headingCursor++;
      elements.push(
        <h2
          key={`h2-${i}`}
          id={headingId}
          className="scroll-mt-24 font-display text-3xl sm:text-[2.15rem] font-medium text-[#25231F] mt-12 mb-5 leading-tight"
        >
          {renderInlineNodes(headingText)}
        </h2>,
      );
      i++;
      continue;
    }

    // Image ![caption](url)
    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (imgMatch) {
      const caption = imgMatch[1].trim();
      const url = imgMatch[2].trim();
      if (isSafeUrl(url)) {
        elements.push(
          <figure key={`fig-${i}`} className="my-10">
            <EditorialImage
              src={url}
              alt={caption || 'Editorial figure'}
              aspectClass="aspect-[4/3]"
              className="border border-[#493528]/12"
            />
            {caption && (
              <figcaption className="mt-3 text-xs font-editorial italic text-[#493528]/75 text-center">
                {caption}
              </figcaption>
            )}
          </figure>,
        );
      }
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-6 space-y-3 pl-5 list-disc marker:text-[#9C443B] font-editorial text-[1.0625rem] sm:text-[1.125rem] leading-[1.82] text-[#25231F]/90">
          {items.map((item, idx) => (
            <li key={idx} className="pl-2">
              {renderInlineNodes(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-6 space-y-3 pl-5 list-decimal marker:text-[#9C443B] marker:font-display marker:font-semibold font-editorial text-[1.0625rem] sm:text-[1.125rem] leading-[1.82] text-[#25231F]/90">
          {items.map((item, idx) => (
            <li key={idx} className="pl-2">
              {renderInlineNodes(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Standard paragraph
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3}\s|>{1,2}\s|[-*]\s|\d+\.\s|!\[|-{3,}|\*{3,})/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    const useDropCap = enableDropCap && !dropCapApplied;
    if (useDropCap) dropCapApplied = true;

    elements.push(
      <p
        key={`p-${i}`}
        className={`font-editorial text-[1.0625rem] sm:text-[1.125rem] leading-[1.85] text-[#25231F]/92 mb-6 ${
          useDropCap ? 'editorial-dropcap' : ''
        }`}
      >
        {renderInlineNodes(paraLines.join(' '))}
      </p>,
    );
  }

  return <div className="editorial-prose">{elements}</div>;
};
