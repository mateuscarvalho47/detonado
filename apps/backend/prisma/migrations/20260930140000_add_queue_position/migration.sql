-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "queuePosition" INTEGER;

-- Keep the order the shelf already shows: newest backlog entry stays first.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "userId"
    ORDER BY "createdAt" DESC
  ) AS pos
  FROM "LibraryEntry"
  WHERE status = 'BACKLOG'
)
UPDATE "LibraryEntry" AS entry
SET "queuePosition" = ranked.pos
FROM ranked
WHERE entry.id = ranked.id;

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_status_queuePosition_idx" ON "LibraryEntry"("userId", "status", "queuePosition");
