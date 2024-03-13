-- AlterTable
ALTER TABLE "APIToken" ADD COLUMN     "apiAuthorizationType" JSONB NOT NULL DEFAULT '["PERSONAL"]';
