// Single home for tunable defaults. Page size is decided by the API (PAGE_SIZE there)
// and comes back with every response, so it is not repeated here.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const DEFAULT_PAGE = 1;

export const MAX_SEARCH_LENGTH = Number(process.env.NEXT_PUBLIC_MAX_SEARCH_LENGTH) || 100;

export const PLACEHOLDER_IMAGE = "/logo.png";
