import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from 'generated/prisma/client';
import prisma from 'lib/db';
import { logAs } from 'src/audit/audit.interceptor';
import { Access, requestContext } from 'src/auth/access';
import { globalRights, NEEDS, ON_TICK, RIGHTS, rightLabel, withNeeds } from 'src/auth/rights';
import { HashidService } from 'src/common/hashid/hashid.service';

const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const tempPassword = () => Array.from({ length: 10 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join('');

@Injectable()
export class UserService {
  constructor(private readonly hashid: HashidService) {}

  catalog() {
    return { rights: RIGHTS, onTick: ON_TICK, needs: NEEDS };
  }

  async list() {
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { username: 'asc' }],
      include: { _count: { select: { houses: true } } },
    });
    return users.map((u) => this.summary(u, u._count.houses));
  }

  async one(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { houses: { include: { house: { select: { name: true } } }, orderBy: { house: { name: 'asc' } } } },
    });
    if (!user) throw new NotFoundException('No such user.');
    return {
      ...this.summary(user, user.houses.length),
      rights: globalRights(user.rights),
      houses: user.houses.map((h) => ({ id: this.hashid.encode(h.houseId), name: h.house.name, rights: h.rights })),
    };
  }

  async create(body: { username?: unknown; name?: unknown; role?: unknown }) {
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) {
      throw new BadRequestException('Username: 3 to 30 letters, digits, dots, dashes or underscores.');
    }
    const role = this.role(body?.role);
    if (await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })) {
      throw new ConflictException('That username is taken.');
    }
    const password = tempPassword();
    logAs('users.create', username);
    try {
      const user = await prisma.user.create({
        data: { username, name: this.name(body?.name), role, password: await bcrypt.hash(password, 10) },
      });
      return { id: this.hashid.encode(user.id), username: user.username, tempPassword: password };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('That username is taken.');
      throw e;
    }
  }

  async update(id: number, body: { name?: unknown; role?: unknown }) {
    logAs('users.edit', (await this.target(id)).username);
    await prisma.user.update({
      where: { id },
      data: {
        ...(body?.name !== undefined ? { name: this.name(body.name) } : {}),
        ...(body?.role !== undefined ? { role: this.role(body.role) } : {}),
      },
    });
    return this.one(id);
  }

  /** Replaces everything a person may do: their global switches and their rights at each house. */
  async setAccess(id: number, body: { rights?: unknown; houses?: unknown }) {
    const user = await this.target(id);
    if (!Array.isArray(body?.houses) || !Array.isArray(body?.rights)) throw new BadRequestException('Send rights and houses.');
    const grid = new Map<number, string[]>();
    for (const h of body.houses as { id?: unknown; rights?: unknown }[]) {
      const houseId = this.hashid.decode(String(h?.id));
      if (!Number.isInteger(houseId) || !Array.isArray(h?.rights)) throw new BadRequestException('Each house needs an id and its rights.');
      const rights = withNeeds(h.rights.map(String));
      if (rights.length) grid.set(houseId, rights);
    }
    const [houses, before] = await Promise.all([
      prisma.house.findMany({ where: { id: { in: [...grid.keys()] } }, select: { id: true, name: true } }),
      prisma.houseAccess.findMany({ where: { userId: id }, include: { house: { select: { name: true } } } }),
    ]);
    if (houses.length !== grid.size) throw new BadRequestException('One of those houses no longer exists.');

    // What changed, house by house, in the words the rights screen uses.
    const rights = globalRights((body.rights as unknown[]).map(String));
    const names = new Map([...houses.map((h) => [h.id, h.name] as const), ...before.map((b) => [b.houseId, b.house.name] as const)]);
    const was = new Map(before.map((b) => [b.houseId, b.rights]));
    const diff = (house: string, from: string[], to: string[]) => ({
      house,
      added: to.filter((r) => !from.includes(r)).map(rightLabel),
      removed: from.filter((r) => !to.includes(r)).map(rightLabel),
    });
    const changed = [
      diff('Across the company', user.rights, rights),
      ...[...new Set([...was.keys(), ...grid.keys()])].map((h) => diff(names.get(h)!, was.get(h) ?? [], grid.get(h) ?? [])),
    ].filter((d) => d.added.length || d.removed.length);

    logAs('users.access', user.username);
    requestContext.getStore()?.changes.push({ table: 'Rights', op: 'diff', after: changed });
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { rights } }),
      prisma.houseAccess.deleteMany({ where: { userId: id } }),
      prisma.houseAccess.createMany({ data: [...grid].map(([houseId, rights]) => ({ userId: id, houseId, rights })) }),
    ]);
    return this.one(id);
  }

  async resetPassword(actor: Access, id: number) {
    const { username } = await this.target(id, actor);
    const password = tempPassword();
    logAs('users.resetPassword', username);
    await prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(password, 10),
        mustChangePassword: true,
        failedLogins: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    return { tempPassword: password };
  }

  async setSuspended(actor: Access, id: number, suspended: unknown) {
    if (typeof suspended !== 'boolean') throw new BadRequestException('Say whether the account is suspended.');
    logAs(suspended ? 'users.suspend' : 'users.unsuspend', (await this.target(id, actor)).username);
    await prisma.user.update({
      where: { id },
      data: suspended ? { suspended, sessionVersion: { increment: 1 } } : { suspended },
    });
    return this.one(id);
  }

  async unlock(id: number) {
    logAs('users.unlock', (await this.target(id)).username);
    await prisma.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
    return this.one(id);
  }

  /** The account being acted on. Nobody acts on root; admins act on agents only. */
  private async target(id: number, actor?: Access) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('No such user.');
    if (user.role === Role.ROOT) throw new ForbiddenException("Root's account can't be changed here.");
    if (actor && !actor.isRoot && user.role !== Role.AGENT) throw new ForbiddenException('Admins can only act on agents.');
    return user;
  }

  private role(role: unknown) {
    if (role !== Role.ADMIN && role !== Role.AGENT) throw new BadRequestException('Role must be admin or agent.');
    return role;
  }

  private name(name: unknown) {
    return typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : null;
  }

  private summary(u: Prisma.UserGetPayload<{}>, houseCount: number) {
    return {
      id: this.hashid.encode(u.id),
      username: u.username,
      name: u.name,
      role: u.role,
      suspended: u.suspended,
      locked: !!u.lockedUntil && u.lockedUntil > new Date(),
      mustChangePassword: u.mustChangePassword,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      houseCount,
    };
  }
}
