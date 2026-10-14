ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
-- Existing accounts keep their current entry flow. New accounts start with NULL.
UPDATE "User" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP;
