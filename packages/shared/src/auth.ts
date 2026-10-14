import { z } from "zod";

// Normaliza emails: trim + lowercase antes de validar formato
export const emailField = z.preprocess(
	(v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
	z.email(),
);

// Auth
export const registerSchema = z.object({
	email: emailField,
	password: z.string().min(8).max(100),
	consent: z.literal(true, {
		error: "Você precisa aceitar os termos para continuar",
	}),
});

export const loginSchema = z.object({
	email: emailField,
	password: z.string().min(8).max(100),
});

export const resendVerificationSchema = z.object({
	email: emailField,
});

export const updateAccountSchema = z
	.object({
		currentPassword: z.string().min(1, "Senha atual obrigatória").max(100),
		email: emailField.optional(),
		newPassword: z.string().min(8).max(100).optional(),
	})
	.refine((d) => d.email !== undefined || d.newPassword !== undefined, {
		message: "Informe pelo menos um campo para atualizar",
	});

export const deleteAccountSchema = z.object({
	password: z
		.string()
		.min(1, "Senha obrigatória para confirmar a exclusão")
		.max(100),
});

export const requestPasswordResetSchema = z.object({
	email: emailField,
});

export const checkPasswordResetSchema = z.object({
	email: emailField,
	code: z.string().regex(/^\d{6}$/, "O código deve ter 6 dígitos"),
});

export const verifyPasswordResetSchema = z
	.object({
		email: emailField,
		code: z.string().regex(/^\d{6}$/, "O código deve ter 6 dígitos"),
		password: z.string().min(8).max(100),
		confirmPassword: z.string().min(8).max(100),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "As senhas não coincidem",
		path: ["confirmPassword"],
	});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type RequestPasswordResetInput = z.infer<
	typeof requestPasswordResetSchema
>;
export type CheckPasswordResetInput = z.infer<typeof checkPasswordResetSchema>;
export type VerifyPasswordResetInput = z.infer<
	typeof verifyPasswordResetSchema
>;
