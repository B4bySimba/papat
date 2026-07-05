-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "unitId" INTEGER;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
