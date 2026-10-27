import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import prisma from 'lib/db';
import { HashidService } from 'src/common/hashid/hashid.service';
import { logAs } from 'src/audit/audit.interceptor';
import { Access, requestContext } from './access';
import { globalRights, RIGHTS } from './rights';

export const SESSION_HOURS = 12;
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const WRONG = 'Wrong username or password.';
// Compared against when the username is unknown, so both cases take as long.
const NOBODY = bcrypt.hashSync('no account has this password', 10);

/** The rule every new password follows. */
export function passwordProblem(password: unknown, username: string) {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 72) return 'Use at most 72 characters.';
  if (password.toLowerCase() === username.toLowerCase()) return "The password can't be the username.";
  return null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly hashid: HashidService,
  ) {}

  sign(user: { id: number; sessionVersion: number }) {
    return this.jwt.sign({ sub: user.id, v: user.sessionVersion });
  }

  async login(username: unknown, password: unknown) {
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      throw new BadRequestException('Enter your username and password.');
    }
    const user = await prisma.user.findFirst({ where: { username: { equals: username.trim(), mode: 'insensitive' } } });
    const refuse = async (reason: string, message = WRONG) => {
      await prisma.auditLog.create({
        data: {
          userId: user?.id,
          username: user?.username ?? username.trim().slice(0, 100),
          action: 'login.failed',
          changes: { reason },
          ip: requestContext.getStore()?.ip,
        },
      });
      return new UnauthorizedException(message);
    };

    if (!user) {
      await bcrypt.compare(password, NOBODY);
      throw await refuse('unknown username');
    }
    const lockedFor = user.lockedUntil ? Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000) : 0;
    if (lockedFor > 0) {
      throw await refuse('locked', `Too many wrong passwords. Try again in ${lockedFor} minute${lockedFor === 1 ? '' : 's'}.`);
    }
    if (!(await bcrypt.compare(password, user.password))) {
      const { failedLogins } = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
      if (failedLogins < LOCK_AFTER) throw await refuse('wrong password');
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
      });
      throw await refuse('wrong password, locked', `Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.`);
    }
    if (user.suspended) throw await refuse('suspended', 'This account is suspended.');

    const store = requestContext.getStore();
    if (store) store.actor = { id: user.id, username: user.username };
    logAs('login');
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    return { token: this.sign(user), mustChangePassword: user.mustChangePassword };
  }

  async changePassword(access: Access, current: unknown, next: unknown) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: access.user.id } });
    if (typeof current !== 'string' || !(await bcrypt.compare(current, user.password))) {
      throw new BadRequestException('Your current password is wrong.');
    }
    const problem = passwordProblem(next, user.username);
    if (problem) throw new BadRequestException(problem);
    if (next === current) throw new BadRequestException('Pick a password different from the current one.');

    logAs('password.change');
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(next as string, 10), mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
    return this.sign(updated);
  }

  /** Who is signed in and what they may do, for the screens to show only what works. */
  async me(access: Access) {
    const { user } = access;
    const houses = access.isRoot
      ? []
      : await prisma.house.findMany({ where: { id: { in: user.houses.map((h) => h.houseId) } }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    const rightsAt = new Map(user.houses.map((h) => [h.houseId, h.rights]));
    return {
      username: user.username,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      rights: access.isRoot ? globalRights(RIGHTS.map((r) => r.key)) : globalRights(user.rights),
      houses: houses.map((h) => ({ id: this.hashid.encode(h.id), name: h.name, rights: rightsAt.get(h.id) ?? [] })),
    };
  }
}
