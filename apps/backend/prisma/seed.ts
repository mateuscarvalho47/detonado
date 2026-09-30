import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { env } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const users = [
  { email: 'alice@example.com', password: 'password123' },
  { email: 'bob@example.com', password: 'password123' },
];

async function main() {
  for (const { email, password } of users) {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.upsert({
      where: { email },
      update: { emailVerified: true },
      create: { email, passwordHash, emailVerified: true },
    });
    console.log(`seeded: ${user.email} (${user.id})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
