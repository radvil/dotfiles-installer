/**
 * Converts a comma-separated string into an array of trimmed strings.
 * Filters out any empty strings resulting from the split or trimming.
 *
 * @param str - The input string, potentially comma-separated.
 * @returns An array of strings, or `undefined` if the input string is `undefined`.
 * @example
 * ```typescript
 * strListToArray("tag1, tag2,tag3"); // Returns ["tag1", "tag2", "tag3"]
 * strListToArray("  "); // Returns []
 * strListToArray(undefined); // Returns undefined
 * ```
 */
export const strListToArray = (str?: string): string[] | undefined => {
  if (str === undefined) {
    return undefined;
  }
  return str
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};
