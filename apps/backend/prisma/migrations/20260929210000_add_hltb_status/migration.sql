-- CreateEnum
CREATE TYPE "HltbStatus" AS ENUM ('FOUND', 'MISS', 'FAILED');

-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "hltbStatus" "HltbStatus";
