-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "mutedNotificationTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Review
ALTER TABLE "Review" ADD COLUMN "imageUrl" TEXT;

-- CreateTable: SearchLog
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);
