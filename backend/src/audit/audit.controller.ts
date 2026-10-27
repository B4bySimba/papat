import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import prisma from 'lib/db';
import { Need } from 'src/auth/need.decorator';
import { RIGHTS, rightLabel } from 'src/auth/rights';
import { HashidService } from 'src/common/hashid/hashid.service';

const LABELS: Record<string, string> = {
  ...Object.fromEntries(RIGHTS.map((r) => [r.key, rightLabel(r.key)])),
  login: 'Logged in',
  'login.failed': 'Failed login',
  logout: 'Logged out',
  'password.change': 'Changed own password',
  'users.create': 'Created an account',
  'users.edit': 'Edited an account',
  'users.access': 'Changed rights',
  'users.resetPassword': 'Reset a password',
  'users.suspend': 'Suspended an account',
  'users.unsuspend': 'Unsuspended an account',
  'users.unlock': 'Unlocked an account',
  'root.create': 'Root created on the server',
  'root.reset': 'Root password reset on the server',
  root: 'Root-only change',
};
const label = (action: string) => LABELS[action] ?? action;

@Controller('audit')
export class AuditController {
  constructor(private readonly hashid: HashidService) {}

  /** The activity log, newest first: a page when `page` is given, otherwise everything matching (for export). */
  @Need('admin')
  @Get()
  async list(@Query() q: { page?: string; pageSize?: string; search?: string; user?: string; house?: string; action?: string }) {
    const pageSize = Math.min(Math.max(Math.trunc(Number(q.pageSize)) || 25, 1), 100);
    const page = Math.max(Math.trunc(Number(q.page)) || 1, 1);
    const search = q.search?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(q.user ? { userId: this.hashid.decode(q.user) || -1 } : {}),
      ...(q.house ? { houseIds: { has: this.hashid.decode(q.house) || -1 } } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
              { action: { in: Object.keys(LABELS).filter((k) => label(k).toLowerCase().includes(search.toLowerCase())) } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { id: 'desc' }, skip: q.page ? (page - 1) * pageSize : 0, take: q.page ? pageSize : 5000 }),
      prisma.auditLog.count({ where }),
    ]);
    const houses = await prisma.house.findMany({
      where: { id: { in: [...new Set(rows.flatMap((r) => r.houseIds))] } },
      select: { id: true, name: true },
    });
    const names = new Map(houses.map((h) => [h.id, h.name]));
    const out = rows.map((r) => ({
      id: String(r.id),
      at: r.at,
      user: r.userId === null ? null : this.hashid.encode(r.userId),
      username: r.username,
      action: r.action,
      actionLabel: label(r.action),
      subject: r.subject,
      houses: r.houseIds.map((id) => names.get(id) ?? 'Deleted house').join(', '),
      changes: r.changes,
      ip: r.ip,
    }));
    return q.page ? { rows: out, total } : out;
  }

  /** Choices for the log's filters: people, houses and actions that appear in it. */
  @Need('admin')
  @Get('filters')
  async filters() {
    const [users, actions, houseIds] = await Promise.all([
      prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: 'asc' } }),
      prisma.auditLog.findMany({ distinct: ['action'], select: { action: true } }),
      prisma.$queryRaw<{ id: number }[]>`SELECT DISTINCT unnest("houseIds") AS id FROM "AuditLog"`,
    ]);
    const houses = await prisma.house.findMany({
      where: { id: { in: houseIds.map((h) => h.id) } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return {
      user: users.map((u) => ({ value: this.hashid.encode(u.id), label: u.username })),
      house: houses.map((h) => ({ value: this.hashid.encode(h.id), label: h.name })),
      action: actions.map((a) => ({ value: a.action, label: label(a.action) })).sort((a, b) => a.label.localeCompare(b.label)),
    };
  }
}
