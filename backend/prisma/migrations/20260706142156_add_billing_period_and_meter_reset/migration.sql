-- AlterTable
ALTER TABLE "MeterReading" ADD COLUMN     "billingPeriod" TIMESTAMP(3),
ADD COLUMN     "isMeterReset" BOOLEAN NOT NULL DEFAULT false;
