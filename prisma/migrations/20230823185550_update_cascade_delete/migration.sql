-- DropForeignKey
ALTER TABLE "UserOptions" DROP CONSTRAINT "UserOptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "network" DROP CONSTRAINT "network_authorId_fkey";

-- AddForeignKey
ALTER TABLE "network" ADD CONSTRAINT "network_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOptions" ADD CONSTRAINT "UserOptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
