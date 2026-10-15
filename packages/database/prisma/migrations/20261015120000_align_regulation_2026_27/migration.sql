-- CreateEnum
CREATE TYPE "GameStage" AS ENUM ('REGULAR_SEASON', 'PLAYOFF');

-- CreateEnum
CREATE TYPE "GameDecision" AS ENUM ('REGULATION', 'SHOOTOUT');

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "awayPeriodScores" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "awayShootoutGoals" INTEGER,
ADD COLUMN     "awayShots" INTEGER,
ADD COLUMN     "decidedBy" "GameDecision",
ADD COLUMN     "homePeriodScores" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "homeShootoutGoals" INTEGER,
ADD COLUMN     "homeShots" INTEGER,
ADD COLUMN     "matchNumber" INTEGER,
ADD COLUMN     "stage" "GameStage" NOT NULL DEFAULT 'REGULAR_SEASON',
ADD COLUMN     "startTimeConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- Expand-only: "otLosses" is kept (deprecated, unused by new code) so code still on the old
-- schema keeps working; drop it in a follow-up migration once this release is live.
ALTER TABLE "standings" ADD COLUMN     "shootoutLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shootoutWins" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "games_seasonId_stage_matchNumber_key" ON "games"("seasonId", "stage", "matchNumber");

