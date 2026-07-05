-- AlterTable
ALTER TABLE "MeterReading" ADD COLUMN     "houseId" INTEGER;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
