/**
 * Utility functions for parsing and handling @mentions in comments
 */

export interface MentionMatch {
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse @mentions from text
 * Matches @username patterns (alphanumeric, underscore, hyphen)
 */
export function parseMentions(text: string): MentionMatch[] {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const mentions: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Extract unique usernames from mentions
 */
export function extractMentionedUsernames(text: string): string[] {
  const mentions = parseMentions(text);
  const usernames = mentions.map(m => m.username);
  return Array.from(new Set(usernames)); // Remove duplicates
}

/**
 * Highlight @mentions in text for display
 * Returns HTML string with mentions wrapped in spans
 */
export function highlightMentions(text: string): string {
  const mentions = parseMentions(text);
  
  if (mentions.length === 0) return text;

  let result = '';
  let lastIndex = 0;

  mentions.forEach(mention => {
    // Add text before mention
    result += text.substring(lastIndex, mention.startIndex);
    // Add highlighted mention
    result += `<span class="mention">@${mention.username}</span>`;
    lastIndex = mention.endIndex;
  });

  // Add remaining text
  result += text.substring(lastIndex);

  return result;
}

/**
 * Check if text contains any mentions
 */
export function hasMentions(text: string): boolean {
  return /@[a-zA-Z0-9_-]+/.test(text);
}
