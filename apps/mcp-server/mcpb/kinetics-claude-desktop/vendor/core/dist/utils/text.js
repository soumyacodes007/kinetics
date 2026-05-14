const TOKEN_SPLIT = /[^a-z0-9]+/i;
export function normalizeText(input) {
    return input.trim().toLowerCase();
}
export function tokenizeText(input) {
    return normalizeText(input)
        .split(TOKEN_SPLIT)
        .map((token) => token.trim())
        .filter(Boolean);
}
export function uniqueTokens(input) {
    const tokens = Array.isArray(input) ? input.flatMap((item) => tokenizeText(item)) : tokenizeText(input);
    return [...new Set(tokens)];
}
//# sourceMappingURL=text.js.map