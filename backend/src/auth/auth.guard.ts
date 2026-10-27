import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Role } from 'generated/prisma/client';
import prisma from 'lib/db';
import { HashidService } from 'src/common/hashid/hashid.service';
import { Access, requestContext } from './access';
import { HouseSource, NEED, Need } from './need.decorator';
import { isGlobal } from './rights';

export const SESSION_ENDED = 'Your session has ended. Please log in again.';
const DENIED = "You don't have the right to do this.";

/** The values at a dotted path, where `*` steps into every item of an array. */
function pick(req: Request, path: string) {
  let values: unknown[] = [req];
  for (const key of path.split('.')) {
    values = values.flatMap((v) =>
      key === '*' ? (Array.isArray(v) ? v : []) : v !== null && typeof v === 'object' ? [(v as any)[key]] : [],
    );
  }
  return values.filter((v) => v !== undefined && v !== null && v !== '').map(String);
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly hashid: HashidService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const meta = this.reflector.get(NEED, ctx.getHandler());
    const need: Parameters<typeof Need>[0] | 'public' = meta?.right ?? 'root';
    const from: HouseSource[] = meta?.from ?? [];
    if (need === 'public') return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const store = requestContext.getStore();
    if (!store) throw new Error('Request context missing: the context middleware must run first.');
    const access = await this.authenticate(req);
    store.access = access;
    store.actor = { id: access.user.id, username: access.user.username };

    if (access.user.mustChangePassword && need !== 'self') {
      throw new ForbiddenException('Please set a new password first.');
    }
    if (need === 'self') return true;
    if (need === 'root' || need === 'admin') {
      if (access.isRoot || (need === 'admin' && access.user.role === Role.ADMIN)) return true;
      throw new ForbiddenException(DENIED);
    }

    const houses = await this.housesNamed(req, from, access.isRoot);
    store.houseIds = [...new Set(houses.map(([houseId]) => houseId))];
    if (access.isRoot) return true;
    if (!from.length) {
      if (isGlobal(need) && !access.can(need)) throw new ForbiddenException(DENIED);
      return true;
    }
    if (!houses.length) throw new BadRequestException('The request does not say which record it is for.');
    for (const [houseId, past] of houses) {
      if (!access.can(need, houseId) || (past && !access.can('pastTenants.view', houseId))) {
        throw new ForbiddenException(DENIED);
      }
    }
    return true;
  }

  private async authenticate(req: Request) {
    const token: string | undefined = req.cookies?.token ?? req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Please log in.');
    const payload = await this.jwt.verifyAsync<{ sub: number; v: number }>(token).catch(() => null);
    if (!payload) throw new UnauthorizedException(SESSION_ENDED);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { houses: true } });
    if (!user || user.sessionVersion !== payload.v) throw new UnauthorizedException(SESSION_ENDED);
    if (user.suspended) throw new UnauthorizedException('This account is suspended.');
    return new Access(user);
  }

  /** [house, belongs to a past tenant] for every record the request names. Root is never refused here. */
  private async housesNamed(req: Request, from: HouseSource[], lenient: boolean) {
    const found: [number, boolean][] = [];
    for (const source of from) {
      const [kind, path] = source.split(/:(.*)/) as [string, string];
      const values = [...new Set(pick(req, path))];
      if (!values.length) continue;
      const records = (await this.lookup(kind, values)).filter((r) => r.houseId != null);
      if (records.length < values.length && !lenient) throw new NotFoundException('That record does not exist.');
      found.push(...records.map((r): [number, boolean] => [r.houseId!, r.past]));
    }
    return found;
  }

  private async lookup(kind: string, values: string[]): Promise<{ houseId?: number | null; past: boolean }[]> {
    const where = { id: { in: values.map((v) => this.hashid.decode(v)).filter(Number.isInteger) } };
    switch (kind) {
      case 'house':
        return (await prisma.house.findMany({ where, select: { id: true } })).map((r) => ({ houseId: r.id, past: false }));
      case 'unit':
        return (await prisma.unit.findMany({ where, select: { houseId: true } })).map((r) => ({ houseId: r.houseId, past: false }));
      case 'tenant':
        return (await prisma.tenant.findMany({ where, select: { state: true, unit: { select: { houseId: true } } } })).map((r) => ({
          houseId: r.unit.houseId,
          past: r.state !== 'ACTIVE',
        }));
      case 'lease':
        return (await prisma.lease.findMany({ where, select: { houseId: true, status: true } })).map((r) => ({
          houseId: r.houseId,
          past: r.status !== 'ACTIVE',
        }));
      case 'leaseCode':
        return (await prisma.lease.findMany({ where: { code: { in: values } }, select: { houseId: true, status: true } })).map((r) => ({
          houseId: r.houseId,
          past: r.status !== 'ACTIVE',
        }));
      case 'payment':
        return (
          await prisma.payment.findMany({ where, select: { houseId: true, unit: { select: { houseId: true } }, lease: { select: { status: true } } } })
        ).map((r) => ({ houseId: r.houseId ?? r.unit?.houseId, past: r.lease?.status === 'TERMINATED' }));
      case 'reading':
        return (
          await prisma.meterReading.findMany({ where, select: { unit: { select: { houseId: true } }, lease: { select: { status: true } } } })
        ).map((r) => ({ houseId: r.unit.houseId, past: r.lease?.status === 'TERMINATED' }));
    }
    throw new Error(`Unknown record kind "${kind}" in @Need.`);
  }
}
