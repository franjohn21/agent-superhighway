-- AlterTable
ALTER TABLE "Inbox" ADD COLUMN     "inviteToken" TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "requestedViaLink" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Inbox_inviteToken_key" ON "Inbox"("inviteToken");

