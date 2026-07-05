-- CreateTable
CREATE TABLE "MeterReading" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "currentReading" DOUBLE PRECISION NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "readOn" TIMESTAMP(3) NOT NULL,
    "cretedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
