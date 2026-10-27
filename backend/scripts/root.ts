// Run on the server when root can't log in: npx tsx scripts/root.ts
// Creates root (papatRoot) if there is none, otherwise gives root a new temporary password and unlocks it.
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import prisma from '../lib/db';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

async function main() {
  const password = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  const data = {
    password: await bcrypt.hash(password, 10),
    mustChangePassword: true,
    suspended: false,
    failedLogins: 0,
    lockedUntil: null,
  };
  const root = await prisma.user.findFirst({ where: { role: 'ROOT' } });
  const user = root
    ? await prisma.user.update({ where: { id: root.id }, data: { ...data, sessionVersion: { increment: 1 } } })
    : await prisma.user.create({ data: { ...data, username: 'papatRoot', role: 'ROOT' } });
  await prisma.auditLog.create({ data: { userId: user.id, username: user.username, action: root ? 'root.reset' : 'root.create', houseIds: [] } });
  console.log(`Root "${user.username}" can log in with this temporary password, then must set a new one:\n\n  ${password}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
