const TOKEN_SPLIT = /[^a-z0-9]+/i;

export function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

export function tokenizeText(input: string): string[] {
  return normalizeText(input)
    .split(TOKEN_SPLIT)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function uniqueTokens(input: string | string[]): string[] {
  const tokens = Array.isArray(input) ? input.flatMap((item) => tokenizeText(item)) : tokenizeText(input);
  return [...new Set(tokens)];
}
