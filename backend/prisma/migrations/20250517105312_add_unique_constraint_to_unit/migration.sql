/*
  Warnings:

  - A unique constraint covering the columns `[houseId,number]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Unit_houseId_number_key" ON "Unit"("houseId", "number");
