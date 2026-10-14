import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { User } from "@/types/api";
import {
	type DeleteAccountFormValues,
	deleteAccountSchema,
	type LoginFormValues,
	loginSchema,
	type RegisterFormValues,
	type RequestResetFormValues,
	registerSchema,
	requestResetSchema,
	type UpdateAccountFormValues,
	updateAccountSchema,
	type VerifyResetFormValues,
	verifyResetSchema,
} from "../schema/authSchema";
import {
	checkPasswordReset,
	consent,
	deleteAccount,
	exportData,
	fetchMe,
	fetchPlatforms,
	login,
	logout,
	register,
	requestPasswordReset,
	resendVerification,
	updateAccount,
	updatePreferences,
	verifyEmail,
	verifyPasswordReset,
} from "../service/authService";

export function useMe(opts?: { enabled?: boolean }) {
	return useQuery<User | null>({
		queryKey: ["me"],
		queryFn: fetchMe,
		staleTime: 1000 * 60 * 5,
		retry: false,
		retryOnMount: false,
		refetchOnWindowFocus: false,
		enabled: opts?.enabled !== false,
	});
}

export function useLogin() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: login,
		onSuccess: (user) => {
			qc.setQueryData(["me"], user);
			qc.invalidateQueries({ queryKey: ["library"] });
		},
	});
}

export function useRegister() {
	return useMutation({ mutationFn: register });
}

export function useVerifyEmail(token: string, enabled: boolean) {
	return useQuery({
		queryKey: ["verify-email", token],
		queryFn: () => verifyEmail(token),
		enabled: !!token && enabled,
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	});
}

export function useResendVerification() {
	return useMutation({ mutationFn: resendVerification });
}

export function useLogout() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: logout,
		onSuccess: () => {
			qc.setQueryData(["me"], null);
			qc.clear();
		},
	});
}

export function useUpdateAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: updateAccount,
		onSuccess: (updated) => {
			qc.setQueryData(["me"], (prev: User | null) =>
				prev ? { ...prev, email: updated.email } : prev,
			);
		},
	});
}

export function useDeleteAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteAccount,
		onSuccess: () => {
			qc.setQueryData(["me"], null);
			qc.clear();
		},
	});
}

export function useConsent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: consent,
		onSuccess: () => {
			qc.setQueryData(["me"], (prev: User | null) =>
				prev ? { ...prev, consentedAt: new Date().toISOString() } : prev,
			);
		},
	});
}

export function useExportData() {
	return useMutation({ mutationFn: exportData });
}

export function useLoginForm(onSuccess: () => void) {
	const mutation = useLogin();

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		await mutation.mutateAsync(values);
		onSuccess();
	});

	return { form, onSubmit, mutation };
}

export function useRegisterForm() {
	const mutation = useRegister();

	const form = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: { email: "", password: "" } as RegisterFormValues,
	});

	const onSubmit = form.handleSubmit((values) => mutation.mutateAsync(values));

	return { form, onSubmit, mutation };
}

export function useUpdateAccountForm(onSuccess: () => void) {
	const mutation = useUpdateAccount();

	const form = useForm<UpdateAccountFormValues>({
		resolver: zodResolver(updateAccountSchema),
		defaultValues: { currentPassword: "", email: "", newPassword: "" },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		await mutation.mutateAsync({
			currentPassword: values.currentPassword,
			email: values.email || undefined,
			newPassword: values.newPassword || undefined,
		});
		form.reset();
		onSuccess();
	});

	return { form, onSubmit, mutation };
}

export function useDeleteAccountForm(onSuccess: () => void) {
	const mutation = useDeleteAccount();

	const form = useForm<DeleteAccountFormValues>({
		resolver: zodResolver(deleteAccountSchema),
		defaultValues: { password: "" },
	});

	const onSubmit = form.handleSubmit((values) =>
		mutation.mutateAsync(values).then(onSuccess),
	);

	return { form, onSubmit, mutation };
}

export function useRequestPasswordReset() {
	return useMutation({ mutationFn: requestPasswordReset });
}

export function useVerifyPasswordReset() {
	return useMutation({ mutationFn: verifyPasswordReset });
}

export function useCheckPasswordReset() {
	return useMutation({ mutationFn: checkPasswordReset });
}

export function useRequestResetForm(onSuccess: (email: string) => void) {
	const mutation = useRequestPasswordReset();

	const form = useForm<RequestResetFormValues>({
		resolver: zodResolver(requestResetSchema),
		defaultValues: { email: "" },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		await mutation.mutateAsync(values);
		onSuccess(values.email);
	});

	return { form, onSubmit, mutation };
}

export function useVerifyResetForm(email: string, onSuccess: () => void) {
	const mutation = useVerifyPasswordReset();

	const form = useForm<VerifyResetFormValues>({
		resolver: zodResolver(verifyResetSchema),
		defaultValues: { email, code: "", password: "", confirmPassword: "" },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		await mutation.mutateAsync(values);
		onSuccess();
	});

	return { form, onSubmit, mutation };
}

export function usePlatforms() {
	return useQuery({
		queryKey: ["platforms"],
		queryFn: fetchPlatforms,
		staleTime: 3600000,
	});
}
export function usePreferences() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: updatePreferences,
		onSuccess: (data) => {
			qc.setQueryData(["me"], (user: User | null) =>
				user ? { ...user, ...data } : user,
			);
		},
	});
}
