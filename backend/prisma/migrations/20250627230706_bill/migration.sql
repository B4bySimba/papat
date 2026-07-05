/*
  Warnings:

  - Added the required column `rate` to the `bill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bill" ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL;
