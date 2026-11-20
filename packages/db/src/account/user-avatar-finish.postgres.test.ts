import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../database/client.js";
import { createDb } from "../database/client.js";
import { runAsSystem } from "../database/row-security.js";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres = process.env.VERIFY_DATABASE && databaseUrl ? describe : describe.skip;

describePostgres("the account avatar finish (PostgreSQL)", () => {
  const userId = `avatar-finish-user-${process.pid}-${Date.now()}`;
  let db: ReturnType<typeof createDb>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    db = createDb(databaseUrl!);
    prisma = db.prisma;
  });

  afterAll(async () => {
    if (!db) return;
    await runAsSystem("test cleanup", () => prisma.user.deleteMany({ where: { id: userId } }));
    await prisma.$disconnect();
    await db.pool.end();
  });

  it("starts on glint for an account created without one, and saves flat", async () => {
    await runAsSystem("test fixture", async () => {
      await prisma.user.create({
        data: {
          id: userId,
          name: userId,
          email: `${userId}@rakazo.test`,
          emailVerified: false,
        },
      });
      const created = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { botAvatarFinish: true, botAvatarSet: true },
      });
      // A row from before the column existed reads the same way: the default is glint.
      expect(created).toEqual({ botAvatarFinish: "glint", botAvatarSet: "organic" });

      await prisma.user.update({ where: { id: userId }, data: { botAvatarFinish: "flat" } });
      const saved = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { botAvatarFinish: true, botAvatarSet: true },
      });
      // The finish never touches the icon set.
      expect(saved).toEqual({ botAvatarFinish: "flat", botAvatarSet: "organic" });
    });
  });
});
