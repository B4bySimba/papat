import z from "zod";

export const unitsListSchema = z.object({
  leaseId: z.string().nullable(),
  leaseCode: z.string().nullable(),
  unitId: z.string(),
  state: z.boolean(),
  unitNumber: z.string(),
  rent: z.number(),
  type: z.string(),
  moveInDate: z.string().nullable(),
  tenantName: z.string().nullable(),
  tenantTel: z.string().nullable(),
  description: z.string(),
  deposit: z.number(),
  additional: z.string(),
  additionalCharges: z.number()
});

export type UnitsList = z.infer<typeof unitsListSchema>;