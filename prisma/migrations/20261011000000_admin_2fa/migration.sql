-- AlterTable: User (관리자 2단계 인증용 컬럼, 기존 데이터에는 영향 없음)
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "totpLastStep" INTEGER;
