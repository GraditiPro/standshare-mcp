import type { PaginationInfo } from "../types/index.js";

export function formatPagination(pagination: PaginationInfo): string {
  const { page, limit, total } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (total <= limit) {
    return `Showing all ${total} results.`;
  }

  if (end >= total) {
    return `Showing ${start}-${end} of ${total}.`;
  }

  return `Showing ${start}-${end} of ${total}. Use \`page: ${page + 1}\` to see more.`;
}
