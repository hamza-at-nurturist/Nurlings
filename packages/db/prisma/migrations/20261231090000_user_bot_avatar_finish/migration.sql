-- How an account draws avatars: "glint" (the full look, today's) or "flat". Existing rows stay glint.
ALTER TABLE "user" ADD COLUMN "botAvatarFinish" TEXT NOT NULL DEFAULT 'glint';
