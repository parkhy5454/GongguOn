-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "agreedAt" TIMESTAMP(3);

-- AlterTable: Event
ALTER TABLE "Event" ADD COLUMN "deadlineReminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Order
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER';
ALTER TABLE "Order" ADD COLUMN "tossPaymentKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingCompany" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;

-- AlterTable: EventMessage
ALTER TABLE "EventMessage" ADD COLUMN "imageUrl" TEXT;
