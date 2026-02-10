-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "plBirth" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "plComment" TEXT,
ADD COLUMN     "plEndpoints" TEXT,
ADD COLUMN     "plID" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "plIdentity" TEXT,
ADD COLUMN     "plRecommend" BOOLEAN NOT NULL DEFAULT false;
