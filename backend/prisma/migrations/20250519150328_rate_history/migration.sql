-- CreateTable
CREATE TABLE "RateHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "rentRate" DOUBLE PRECISION NOT NULL,
    "waterRate" DOUBLE PRECISION NOT NULL,
    "electricityRate" DOUBLE PRECISION NOT NULL,
    "garbageFee" DOUBLE PRECISION NOT NULL,
    "added_field_1_price" DOUBLE PRECISION NOT NULL,
    "added_field_2_price" DOUBLE PRECISION NOT NULL,
    "added_field_3_price" DOUBLE PRECISION NOT NULL,
    "added_field_4_price" DOUBLE PRECISION NOT NULL,
    "added_field_5_price" DOUBLE PRECISION NOT NULL,
    "added_field_6_price" DOUBLE PRECISION NOT NULL,
    "added_field_7_price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unitId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,

    CONSTRAINT "RateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateHistory_tenantId_key" ON "RateHistory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RateHistory_unitId_key" ON "RateHistory"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "RateHistory_houseId_key" ON "RateHistory"("houseId");

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
