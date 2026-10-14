CREATE TYPE "SourceKind" AS ENUM ('STORE', 'PHYSICAL', 'SUBSCRIPTION', 'LOAN');
CREATE TABLE "GameSource" (
 "id" TEXT PRIMARY KEY, "entryId" TEXT NOT NULL, "userId" TEXT NOT NULL, "kind" "SourceKind" NOT NULL, "label" TEXT NOT NULL, "expiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GameSource_entryId_userId_fkey" FOREIGN KEY ("entryId", "userId") REFERENCES "LibraryEntry"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GameSource_entryId_createdAt_idx" ON "GameSource"("entryId", "createdAt");
