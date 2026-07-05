/*
  Warnings:

  - Added the required column `invoiceNumber` to the `payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "name" DOUBLE PRECISION,
ADD COLUMN     "transID" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "unprocessed" (
    "name" DOUBLE PRECISION NOT NULL,
    "transID" DOUBLE PRECISION NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "comment" TEXT,
    "leaseId" TEXT,
    "cretedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "unprocessed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unprocessed_reference_key" ON "unprocessed"("reference");
