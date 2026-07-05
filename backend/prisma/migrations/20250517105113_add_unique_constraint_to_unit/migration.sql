/*
  Warnings:

  - A unique constraint covering the columns `[houseId,id]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Unit_houseId_id_key" ON "Unit"("houseId", "id");
