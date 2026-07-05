/*
  Warnings:

  - You are about to drop the column `invoiceNumber` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `transID` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the `unprocessed` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `paymentMethod` on table `payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "payment" DROP COLUMN "invoiceNumber",
DROP COLUMN "name",
DROP COLUMN "transID",
ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawDetails" JSONB,
ALTER COLUMN "paymentMethod" SET NOT NULL,
ALTER COLUMN "leaseId" DROP NOT NULL,
ALTER COLUMN "tenantId" DROP NOT NULL,
ALTER COLUMN "houseId" DROP NOT NULL;

-- DropTable
DROP TABLE "unprocessed";
