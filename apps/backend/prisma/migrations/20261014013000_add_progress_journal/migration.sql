CREATE TABLE "JournalEntry" (
 "id" TEXT PRIMARY KEY, "entryId" TEXT NOT NULL, "userId" TEXT NOT NULL, "campaignId" TEXT NOT NULL,
 "text" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "spoiler" BOOLEAN NOT NULL DEFAULT false, "legacy" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "JournalEntry_entryId_userId_fkey" FOREIGN KEY ("entryId", "userId") REFERENCES "LibraryEntry"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "JournalEntry_campaignId_entryId_userId_fkey" FOREIGN KEY ("campaignId", "entryId", "userId") REFERENCES "Campaign"("id", "entryId", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "JournalEntry_entryId_occurredAt_idx" ON "JournalEntry"("entryId", "occurredAt");
-- Original note dates are unknown. Use migration time and mark provenance explicitly;
-- keep the source notes unchanged and do not copy the stale active campaign snapshot.
INSERT INTO "JournalEntry" (id,"entryId","userId","campaignId",text,"occurredAt",legacy,"updatedAt")
 SELECT 'journal_entry_' || e.id,e.id,e."userId",e."activeCampaignId",e.notes,NOW(),true,NOW()
 FROM "LibraryEntry" e WHERE e."activeCampaignId" IS NOT NULL AND e.notes IS NOT NULL AND BTRIM(e.notes) <> '';
INSERT INTO "JournalEntry" (id,"entryId","userId","campaignId",text,"occurredAt",legacy,"updatedAt")
 SELECT 'journal_campaign_' || c.id,c."entryId",c."userId",c.id,c.notes,NOW(),true,NOW()
 FROM "Campaign" c WHERE c."archivedAt" IS NOT NULL AND c.notes IS NOT NULL AND BTRIM(c.notes) <> '';
