-- CreateEnum
CREATE TYPE "InvestmentEarningsType" AS ENUM ('SCHEDULED', 'PAID', 'UNVALIDATED');

-- AlterTable
ALTER TABLE "investment_earnings" ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "type" "InvestmentEarningsType" NOT NULL DEFAULT 'SCHEDULED';
