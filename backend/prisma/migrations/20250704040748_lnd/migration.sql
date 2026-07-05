/*
  Warnings:

  - A unique constraint covering the columns `[contact]` on the table `Landlord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nationalId]` on the table `Landlord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Landlord_contact_key" ON "Landlord"("contact");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_nationalId_key" ON "Landlord"("nationalId");
