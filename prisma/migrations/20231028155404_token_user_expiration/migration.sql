-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "APIToken" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "APIToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "APIToken_token_key" ON "APIToken"("token");

-- AddForeignKey
ALTER TABLE "APIToken" ADD CONSTRAINT "APIToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
