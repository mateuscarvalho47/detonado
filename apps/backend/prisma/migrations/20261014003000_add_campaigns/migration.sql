CREATE TABLE "Campaign" (
 "id" TEXT PRIMARY KEY, "entryId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "archivedAt" TIMESTAMP(3),
 "status" "LibraryStatus" NOT NULL DEFAULT 'PLAYING', "baseHours" DECIMAL(6,1), "hoursPlayed" DECIMAL(6,1),
 "rating" INTEGER, "notes" TEXT, "completedAt" TIMESTAMP(3), "completionGoal" "CompletionGoal" NOT NULL DEFAULT 'MAIN',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Campaign_entryId_userId_fkey" FOREIGN KEY ("entryId", "userId") REFERENCES "LibraryEntry"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Campaign_id_entryId_userId_key" ON "Campaign"("id", "entryId", "userId");
CREATE INDEX "Campaign_userId_archivedAt_idx" ON "Campaign"("userId", "archivedAt");
CREATE INDEX "Campaign_entryId_startedAt_idx" ON "Campaign"("entryId", "startedAt");
ALTER TABLE "LibraryEntry" ADD COLUMN "activeCampaignId" TEXT;
INSERT INTO "Campaign" ("id", "entryId", "userId", "startedAt", "status", "baseHours", "hoursPlayed", "rating", "notes", "completedAt", "completionGoal", "createdAt", "updatedAt")
 SELECT 'campaign_' || "id", "id", "userId", "createdAt", "status", "baseHours", "hoursPlayed", "rating", "notes", "completedAt", "completionGoal", "createdAt", "updatedAt" FROM "LibraryEntry";
UPDATE "LibraryEntry" SET "activeCampaignId" = 'campaign_' || "id";
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_activeCampaignId_fkey" FOREIGN KEY ("activeCampaignId") REFERENCES "Campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "PlaySession" ADD COLUMN "campaignId" TEXT;
UPDATE "PlaySession" SET "campaignId" = 'campaign_' || "entryId";
ALTER TABLE "PlaySession" ALTER COLUMN "campaignId" SET NOT NULL;
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_campaignId_entryId_userId_fkey" FOREIGN KEY ("campaignId", "entryId", "userId") REFERENCES "Campaign"("id", "entryId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_active_campaign_owner_check" FOREIGN KEY ("activeCampaignId", "id", "userId") REFERENCES "Campaign"("id", "entryId", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;
