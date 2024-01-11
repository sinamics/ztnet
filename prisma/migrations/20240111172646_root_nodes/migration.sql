/*
  Warnings:

  - You are about to drop the column `plBirth` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `plComment` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `plEndpoints` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `plID` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `plIdentity` on the `GlobalOptions` table. All the data in the column will be lost.
  - You are about to drop the column `plRecommend` on the `GlobalOptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[planetId]` on the table `GlobalOptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GlobalOptions" DROP COLUMN "plBirth",
DROP COLUMN "plComment",
DROP COLUMN "plEndpoints",
DROP COLUMN "plID",
DROP COLUMN "plIdentity",
DROP COLUMN "plRecommend",
ADD COLUMN     "planetId" INTEGER;

-- CreateTable
CREATE TABLE "Planet" (
    "id" SERIAL NOT NULL,
    "plID" BIGINT NOT NULL DEFAULT 0,
    "plBirth" BIGINT NOT NULL DEFAULT 0,
    "plRecommend" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RootNodes" (
    "id" SERIAL NOT NULL,
    "PlanetId" INTEGER NOT NULL,
    "comments" TEXT,
    "identity" TEXT NOT NULL,
    "endpoints" JSONB NOT NULL,

    CONSTRAINT "RootNodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalOptions_planetId_key" ON "GlobalOptions"("planetId");

-- AddForeignKey
ALTER TABLE "GlobalOptions" ADD CONSTRAINT "GlobalOptions_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootNodes" ADD CONSTRAINT "RootNodes_PlanetId_fkey" FOREIGN KEY ("PlanetId") REFERENCES "Planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
