-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "movedFromLeaseId" INTEGER;

-- CreateTable
CREATE TABLE "RateChange" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER,
    "houseId" INTEGER,
    "month" TEXT NOT NULL,
    "rentRate" DOUBLE PRECISION,
    "rentDue" INTEGER,
    "waterRate" DOUBLE PRECISION,
    "serviceCharge" DOUBLE PRECISION,
    "garbageFee" DOUBLE PRECISION,
    "additional" TEXT,
    "additionalCharges" DOUBLE PRECISION,
    "added_field_1" TEXT,
    "added_field_1_price" DOUBLE PRECISION,
    "added_field_2" TEXT,
    "added_field_2_price" DOUBLE PRECISION,
    "added_field_3" TEXT,
    "added_field_3_price" DOUBLE PRECISION,
    "added_field_4" TEXT,
    "added_field_4_price" DOUBLE PRECISION,
    "added_field_5" TEXT,
    "added_field_5_price" DOUBLE PRECISION,
    "added_field_6" TEXT,
    "added_field_6_price" DOUBLE PRECISION,
    "added_field_7" TEXT,
    "added_field_7_price" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateChange_leaseId_month_key" ON "RateChange"("leaseId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "RateChange_houseId_month_key" ON "RateChange"("houseId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_movedFromLeaseId_key" ON "Lease"("movedFromLeaseId");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_movedFromLeaseId_fkey" FOREIGN KEY ("movedFromLeaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RateChange" ADD CONSTRAINT "RateChange_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RateChange" ADD CONSTRAINT "RateChange_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

