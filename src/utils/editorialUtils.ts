export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

export function extractHeadings(content: string): TocHeading[] {
  if (!content) return [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headings: TocHeading[] = [];
  const usedIds = new Map<string, number>();

  for (const raw of lines) {
    const line = raw.trim();
    let level: 2 | 3 | null = null;
    let rawText = '';

    if (line.startsWith('### ')) {
      level = 3;
      rawText = line.slice(4);
    } else if (line.startsWith('## ')) {
      level = 2;
      rawText = line.slice(3);
    } else if (line.startsWith('# ')) {
      level = 2;
      rawText = line.slice(2);
    }

    if (level !== null) {
      const text = stripInlineMarkdown(rawText);
      if (!text) continue;
      const baseSlug = slugify(text) || 'section';
      const count = (usedIds.get(baseSlug) ?? 0) + 1;
      usedIds.set(baseSlug, count);
      const id = count === 1 ? `sec-${baseSlug}` : `sec-${baseSlug}-${count}`;
      headings.push({ id, text, level });
    }
  }

  return headings;
}

export function countWords(content: string): number {
  if (!content) return 0;
  const plainText = content
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>{1,2}\s+/gm, '')
    .replace(/[-*_`#>|[\]()!]/g, ' ')
    .trim();
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}

export function calculateReadingTime(content: string): number {
  const words = countWords(content);
  return Math.max(1, Math.min(180, Math.ceil(words / 200)));
}

export function formatEditorialDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function compressImageFile(file: File, maxWidth = 1280): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPEG, PNG, or WebP).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the selected image.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas compression is unavailable in this browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 320000 && quality > 0.35) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > 345000) {
          reject(new Error('Image remains too large after compression. Please choose a smaller photograph.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
