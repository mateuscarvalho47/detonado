ALTER TABLE "LibraryEntry" ADD COLUMN "baseHours" DECIMAL(6,1), ADD COLUMN "lastSessionAt" TIMESTAMP(3);
UPDATE "LibraryEntry" SET "baseHours" = "hoursPlayed";
CREATE TABLE "PlaySession" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "entryId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL, "playedAt" TIMESTAMP(3) NOT NULL, "durationMinutes" INTEGER NOT NULL,
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlaySession_duration_check" CHECK ("durationMinutes" BETWEEN 1 AND 1440),
  CONSTRAINT "PlaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlaySession_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LibraryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlaySession_userId_clientId_key" ON "PlaySession"("userId", "clientId");
CREATE INDEX "PlaySession_entryId_playedAt_idx" ON "PlaySession"("entryId", "playedAt");
