import { z } from "zod";

export const meterReadingsSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  unitNumber: z.string(),
  houseId: z.string(),
  houseName: z.string(),
  readOn: z.string(),
  closingFor: z.string(),
  currentReading: z.number(),
  pricePerUnit: z.number()
});

export type MeterReading = z.infer<typeof meterReadingsSchema>;
