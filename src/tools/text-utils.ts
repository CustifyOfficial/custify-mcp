/**
 * Strip HTML tags and normalise whitespace.
 *
 * Handles common Custify rich-text patterns:
 * - <br>, <br/>, </p>, </div>, </li> → newline
 * - <li> → "- " (markdown list marker)
 * - All other tags stripped
 * - HTML entities decoded (&amp; &lt; &gt; &quot; &#39; &nbsp; and numeric &#NNN; / &#xHH;)
 * - Consecutive blank lines collapsed to one
 * - Lines trimmed, leading/trailing whitespace removed
 */
export function stripHtml(html: string): string {
  return html
    // block-level breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|blockquote)>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    // strip remaining tags
    .replace(/<[^>]+>/g, '')
    // decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // normalise whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Truncate text to `maxChars`, appending '…' if truncated.
 * Breaks at the last space before the limit to avoid splitting words.
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.lastIndexOf(' ', maxChars);
  const end = cut > maxChars * 0.5 ? cut : maxChars;
  return text.slice(0, end) + '…';
}
