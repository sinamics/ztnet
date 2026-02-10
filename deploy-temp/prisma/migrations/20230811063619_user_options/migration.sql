/*
  Warnings:

  - You are about to drop the column `showNotationMarkerInTableRow` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `useNotationColorAsBg` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `ztCentralApiKey` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `ztCentralApiUrl` on the `GlobalOptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GlobalOptions" DROP COLUMN "showNotationMarkerInTableRow",
DROP COLUMN "useNotationColorAsBg",
DROP COLUMN "ztCentralApiKey",
DROP COLUMN "ztCentralApiUrl";

-- CreateTable
CREATE TABLE "UserOptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "useNotationColorAsBg" BOOLEAN DEFAULT false,
    "showNotationMarkerInTableRow" BOOLEAN DEFAULT true,
    "ztCentralApiKey" TEXT DEFAULT '',
    "ztCentralApiUrl" TEXT DEFAULT 'https://api.zerotier.com/api/v1',
    "localControllerUrl" TEXT DEFAULT 'http://zerotier:9993',
    "localControllerSecret" TEXT DEFAULT '',

    CONSTRAINT "UserOptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOptions_userId_key" ON "UserOptions"("userId");

-- AddForeignKey
ALTER TABLE "UserOptions" ADD CONSTRAINT "UserOptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
