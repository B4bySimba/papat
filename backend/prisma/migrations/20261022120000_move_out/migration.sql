-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "moveOutReason" TEXT,
ADD COLUMN     "depositExpenses" DOUBLE PRECISION,
ADD COLUMN     "depositExpensesNote" TEXT,
ADD COLUMN     "depositRefund" DOUBLE PRECISION;
