-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "TransactionStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "TransactionStatus" ADD VALUE 'CHARGEBACK';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "external_id" TEXT,
                         ADD COLUMN "payment_method" TEXT,
                         ADD COLUMN "paid_at" TIMESTAMP(3),
                         ADD COLUMN "gateway_response" JSONB,
                         ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;