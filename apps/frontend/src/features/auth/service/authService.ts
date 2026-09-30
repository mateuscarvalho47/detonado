import { ApiError, api, clearCsrfToken } from "@/lib/api";
import type { User } from "@/types/api";

export async function fetchMe(): Promise<User | null> {
	try {
		return await api.get<User>("/auth/me");
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return null;
		throw e;
	}
}

export async function login(data: { email: string; password: string }) {
	const user = await api.post<User>("/auth/login", data);
	clearCsrfToken();
	return user;
}

export function register(data: {
	email: string;
	password: string;
	consent: true;
}) {
	return api.post<{ message: string }>("/auth/register", data);
}

export function verifyEmail(token: string) {
	return api.get<{ message: string }>(`/auth/verify-email?token=${token}`);
}

export function resendVerification(email: string) {
	return api.post<{ message: string }>("/auth/resend-verification", { email });
}

export async function logout() {
	const result = await api.post("/auth/logout");
	clearCsrfToken();
	return result;
}

export function updateAccount(data: {
	currentPassword: string;
	email?: string;
	newPassword?: string;
}) {
	const payload: Record<string, string> = {
		currentPassword: data.currentPassword,
	};
	if (data.email) payload.email = data.email;
	if (data.newPassword) payload.newPassword = data.newPassword;
	return api.patch<{ id: string; email: string; emailVerified: boolean }>(
		"/auth/account",
		payload,
	);
}

export async function deleteAccount(data: { password: string }) {
	const result = await api.delete("/auth/account", data);
	clearCsrfToken();
	return result;
}

export function consent() {
	return api.post("/auth/consent");
}

export function exportData() {
	return api.get<unknown>("/auth/export");
}

export function requestPasswordReset(data: { email: string }) {
	return api.post<{ message: string }>("/password-reset/request", data);
}

export function checkPasswordReset(data: { email: string; code: string }) {
	return api.post<{ message: string }>("/password-reset/check", data);
}

export function verifyPasswordReset(data: {
	email: string;
	code: string;
	password: string;
	confirmPassword: string;
}) {
	return api.post<{ message: string }>("/password-reset/verify", data);
}
