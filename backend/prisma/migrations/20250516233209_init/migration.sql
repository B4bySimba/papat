-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lr_number" TEXT,
    "agreed_commission" DOUBLE PRECISION,
    "water_bill" DOUBLE PRECISION,
    "garbage_collection" DOUBLE PRECISION,
    "electricity_bill" DOUBLE PRECISION,
    "added_field_1" TEXT,
    "added_field_1_price" DOUBLE PRECISION,
    "added_field_2" TEXT,
    "added_field_2_price" DOUBLE PRECISION,
    "added_field_3" TEXT,
    "added_field_3_price" DOUBLE PRECISION,
    "added_field_4" TEXT,
    "added_field_4_price" DOUBLE PRECISION,
    "added_field_5" TEXT,
    "added_field_5_price" DOUBLE PRECISION,
    "added_field_6" TEXT,
    "added_field_6_price" DOUBLE PRECISION,
    "added_field_7" TEXT,
    "added_field_7_price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landlordId" TEXT NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landlord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "nationalId" INTEGER,
    "email" TEXT,

    CONSTRAINT "Landlord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "House_name_key" ON "House"("name");

-- AddForeignKey
ALTER TABLE "House" ADD CONSTRAINT "House_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
