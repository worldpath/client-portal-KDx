/**
 * Diff algorithm for comparing two text documents line-by-line
 * Uses a simplified Myers diff algorithm
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  oldContent?: string; // For modified lines
}

export interface DiffResult {
  lines: DiffLine[];
  stats: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two lines are similar enough to be considered modified rather than replaced
 */
function areLinesModified(line1: string, line2: string): boolean {
  const maxLen = Math.max(line1.length, line2.length);
  if (maxLen === 0) return false;
  
  const distance = levenshteinDistance(line1, line2);
  const similarity = 1 - (distance / maxLen);
  
  // If lines are more than 40% similar, consider them modified
  return similarity > 0.4;
}

/**
 * Perform line-by-line diff comparison
 */
export function computeDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result: DiffLine[] = [];
  const stats = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
  };

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(oldLines, newLines);
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && 
        oldIndex < oldLines.length && 
        newIndex < newLines.length &&
        oldLines[oldIndex] === lcs[lcsIndex] && 
        newLines[newIndex] === lcs[lcsIndex]) {
      // Unchanged line
      result.push({
        type: 'unchanged',
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        content: oldLines[oldIndex],
      });
      stats.unchanged++;
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (oldIndex < oldLines.length && newIndex < newLines.length) {
      // Check if lines are modified or completely different
      if (areLinesModified(oldLines[oldIndex], newLines[newIndex])) {
        result.push({
          type: 'modified',
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
          content: newLines[newIndex],
          oldContent: oldLines[oldIndex],
        });
        stats.modified++;
        oldIndex++;
        newIndex++;
      } else {
        // Lines are completely different - treat as remove + add
        result.push({
          type: 'removed',
          oldLineNumber: oldIndex + 1,
          content: oldLines[oldIndex],
        });
        stats.removed++;
        oldIndex++;
      }
    } else if (oldIndex < oldLines.length) {
      // Removed line
      result.push({
        type: 'removed',
        oldLineNumber: oldIndex + 1,
        content: oldLines[oldIndex],
      });
      stats.removed++;
      oldIndex++;
    } else {
      // Added line
      result.push({
        type: 'added',
        newLineNumber: newIndex + 1,
        content: newLines[newIndex],
      });
      stats.added++;
      newIndex++;
    }
  }

  return { lines: result, stats };
}

/**
 * Find longest common subsequence of lines
 */
function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const len1 = arr1.length;
  const len2 = arr2.length;
  const dp: number[][] = Array(len1 + 1).fill(0).map(() => Array(len2 + 1).fill(0));

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const lcs: string[] = [];
  let i = len1;
  let j = len2;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
