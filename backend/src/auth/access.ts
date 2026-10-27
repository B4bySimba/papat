import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, Role } from 'generated/prisma/client';
import { Right } from './rights';

export class Access {
  private readonly byHouse: Map<number, Set<string>>;

  constructor(readonly user: Prisma.UserGetPayload<{ include: { houses: true } }>) {
    this.byHouse = new Map(user.houses.map((h) => [h.houseId, new Set(h.rights)]));
  }

  get isRoot() {
    return this.user.role === Role.ROOT;
  }

  /** A house right at `houseId`, or a global right when no house is given. */
  can(right: Right, houseId?: number) {
    if (this.isRoot) return true;
    return houseId === undefined ? this.user.rights.includes(right) : !!this.byHouse.get(houseId)?.has(right);
  }

  /** Houses where `right` is held (any house assigned when no right is given); null means every house. */
  houses(right?: Right): number[] | null {
    if (this.isRoot) return null;
    return [...this.byHouse].filter(([, rights]) => !right || rights.has(right)).map(([id]) => id);
  }
}

export const requestContext = new AsyncLocalStorage<{
  access?: Access;
  actor?: { id: number; username: string };
  action?: string;
  subject?: string;
  houseIds: number[];
  changes: unknown[];
  ip?: string;
}>();

/** The signed-in user's access. Null outside a request (scripts); inside one a missing guard fails loudly, never as "everything". */
export function currentAccess() {
  const store = requestContext.getStore();
  if (!store) return null;
  if (!store.access) throw new Error('Access read before the request was authenticated.');
  return store.access;
}

/** Prisma filter keeping rows in houses where `right` is held. */
export function inHouses(right?: Right, field = 'houseId') {
  const ids = currentAccess()?.houses(right);
  return ids ? { [field]: { in: ids } } : {};
}

/** The same as a SQL condition, or null when nothing is filtered. */
export function houseSql(column: Prisma.Sql, right: Right) {
  const ids = currentAccess()?.houses(right);
  if (!ids) return null;
  return ids.length ? Prisma.sql`${column} IN (${Prisma.join(ids)})` : Prisma.sql`FALSE`;
}

/** Whether the current user may see `right` at `houseId` (true outside requests). */
export const canAt = (right: Right, houseId: number) => currentAccess()?.can(right, houseId) ?? true;
