/** Shared pagination math for list services and pages. */

export interface Paged {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function paginate(params: { page?: number; pageSize?: number }, defaultSize = 20, maxSize = 100): Paged {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(maxSize, Math.max(1, params.pageSize ?? defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
