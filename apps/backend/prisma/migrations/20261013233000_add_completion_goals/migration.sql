CREATE TYPE "CompletionGoal" AS ENUM ('MAIN', 'EXTRAS', 'COMPLETIONIST');
ALTER TABLE "LibraryEntry" ADD COLUMN "completionGoal" "CompletionGoal" NOT NULL DEFAULT 'MAIN';
CREATE TABLE "ChecklistItem" (
 "id" TEXT PRIMARY KEY, "entryId" TEXT NOT NULL, "userId" TEXT NOT NULL, "text" TEXT NOT NULL,
 "completed" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ChecklistItem_entryId_userId_fkey" FOREIGN KEY ("entryId", "userId") REFERENCES "LibraryEntry"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChecklistItem_entryId_createdAt_idx" ON "ChecklistItem"("entryId", "createdAt");
