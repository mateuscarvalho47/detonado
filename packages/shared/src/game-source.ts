import { z } from "zod";
export const sourceKindSchema = z.enum([
	"STORE",
	"PHYSICAL",
	"SUBSCRIPTION",
	"LOAN",
]);
export const createGameSourceSchema = z.strictObject({
	kind: sourceKindSchema,
	label: z.string().trim().min(1).max(200),
	expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export const updateGameSourceSchema = createGameSourceSchema
	.partial()
	.refine((input) => Object.keys(input).length > 0, {
		message: "Informe pelo menos um campo",
	});
export type CreateGameSourceInput = z.infer<typeof createGameSourceSchema>;
export type UpdateGameSourceInput = z.infer<typeof updateGameSourceSchema>;
