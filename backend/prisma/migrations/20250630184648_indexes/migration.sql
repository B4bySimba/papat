-- CreateEnum
CREATE TYPE "MStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "maintenance" (
    "id" SERIAL NOT NULL,
    "houseId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "reportedById" INTEGER,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "status" "MStatus" NOT NULL DEFAULT 'PENDING',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "remarks" TEXT,

    CONSTRAINT "maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_houseId_idx" ON "maintenance"("houseId");

-- CreateIndex
CREATE INDEX "maintenance_unitId_idx" ON "maintenance"("unitId");

-- CreateIndex
CREATE INDEX "maintenance_reportedById_idx" ON "maintenance"("reportedById");

-- CreateIndex
CREATE INDEX "House_landlordId_idx" ON "House"("landlordId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_houseId_idx" ON "Lease"("houseId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "Lease_startDate_idx" ON "Lease"("startDate");

-- CreateIndex
CREATE INDEX "Lease_houseId_status_idx" ON "Lease"("houseId", "status");

-- CreateIndex
CREATE INDEX "MeterReading_leaseId_idx" ON "MeterReading"("leaseId");

-- CreateIndex
CREATE INDEX "MeterReading_tenantId_idx" ON "MeterReading"("tenantId");

-- CreateIndex
CREATE INDEX "MeterReading_unitId_idx" ON "MeterReading"("unitId");

-- CreateIndex
CREATE INDEX "MeterReading_readOn_idx" ON "MeterReading"("readOn");

-- CreateIndex
CREATE INDEX "Tenant_unitId_idx" ON "Tenant"("unitId");

-- CreateIndex
CREATE INDEX "Tenant_state_idx" ON "Tenant"("state");

-- CreateIndex
CREATE INDEX "Unit_houseId_idx" ON "Unit"("houseId");

-- CreateIndex
CREATE INDEX "Unit_number_idx" ON "Unit"("number");

-- CreateIndex
CREATE INDEX "payment_leaseId_idx" ON "payment"("leaseId");

-- CreateIndex
CREATE INDEX "payment_tenantId_idx" ON "payment"("tenantId");

-- CreateIndex
CREATE INDEX "payment_houseId_idx" ON "payment"("houseId");

-- CreateIndex
CREATE INDEX "payment_unitId_idx" ON "payment"("unitId");

-- CreateIndex
CREATE INDEX "payment_date_idx" ON "payment"("date");

-- CreateIndex
CREATE INDEX "payment_leaseId_date_idx" ON "payment"("leaseId", "date");

-- CreateIndex
CREATE INDEX "payment_houseId_date_idx" ON "payment"("houseId", "date");

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
