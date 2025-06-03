/*
  Warnings:

  - Made the column `updated_at` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;
