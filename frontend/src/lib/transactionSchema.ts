import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  unitNumber: z.string(),
  tenantName: z.string(),
  tenantContact: z.string(),
  houseId: z.string(),
  houseName: z.string(),
  date: z.string(),
  amount: z.number(),
  reference: z.string(),
  paymentMethod: z.string(),
  comment: z.string().nullable(),
  processed: z.boolean(),
  manualInput: z.boolean().nullable(),
});

export type Transaction = z.infer<typeof transactionSchema>;
