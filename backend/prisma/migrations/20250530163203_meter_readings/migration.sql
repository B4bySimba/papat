/*
  Warnings:

  - The primary key for the `MeterReading` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `MeterReading` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MeterReading" DROP CONSTRAINT "MeterReading_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "readOn" SET DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id");
