import { z } from "zod";
export const groupSchema = z.object({
	name: z.string().trim().min(1, "Informe um nome.").max(100),
});
export type GroupValues = z.infer<typeof groupSchema>;
export const membershipSchema = z.object({
	collectionIds: z.array(z.string()).max(100),
	tagIds: z.array(z.string()).max(100),
});
export type MembershipValues = z.infer<typeof membershipSchema>;
