-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "hourCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hourWindowStart" TIMESTAMP(3);
