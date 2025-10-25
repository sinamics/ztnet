-- AlterTable
ALTER TABLE "GlobalOptions" ADD COLUMN     "smtpFromName" TEXT;

-- AlterTable
ALTER TABLE "_MemberRelation" ADD CONSTRAINT "_MemberRelation_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_MemberRelation_AB_unique";
