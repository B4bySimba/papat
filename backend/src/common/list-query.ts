import { Prisma } from 'generated/prisma/client';

export type ListQuery = {
  page?: string;
  pageSize?: string;
  search?: string;
  houseId?: string;
  unitId?: string;
  sort?: string;
  dir?: string;
};

/** ILIKE pattern matching `search` literally anywhere in a value. */
export const containsPattern = (search: string) =>
  `%${String(search).replace(/[\\%_]/g, '\\$&')}%`;

/** A hash that doesn't decode matches nothing. */
export const idEquals = (column: Prisma.Sql, id: number) =>
  Number.isInteger(id) ? Prisma.sql`${column} = ${id}` : Prisma.sql`FALSE`;

export const whereAll = (conditions: Prisma.Sql[]) =>
  conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;

/** Blanks sort as the smallest value, as they did when the table sorted in the browser. */
export const orderBy = (
  columns: Record<string, Prisma.Sql>,
  q: ListQuery,
  fallback: Prisma.Sql,
) => {
  if (!q.sort || !Object.hasOwn(columns, q.sort)) return fallback;
  return q.dir === 'desc'
    ? Prisma.sql`${columns[q.sort]} DESC NULLS LAST, ${fallback}`
    : Prisma.sql`${columns[q.sort]} ASC NULLS FIRST, ${fallback}`;
};

export const limitOffset = (q: ListQuery) => {
  const pageSize = Math.min(
    Math.max(Math.trunc(Number(q.pageSize)) || 10, 1),
    100,
  );
  const page = Math.max(Math.trunc(Number(q.page)) || 1, 1);
  return Prisma.sql`LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
};
