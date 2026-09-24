import { useNavigate } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useCheckPasswordReset, useVerifyResetForm } from "../hooks/useAuth";

interface VerifyResetFormProps {
	email: string;
}

export function VerifyResetForm({ email }: VerifyResetFormProps) {
	const navigate = useNavigate();
	const { form, onSubmit, mutation } = useVerifyResetForm(email, () =>
		navigate({ to: "/reset-success" }),
	);
	const check = useCheckPasswordReset();
	const [codeValidated, setCodeValidated] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const {
		register,
		control,
		getValues,
		setError,
		clearErrors,
		formState: { errors },
	} = form;

	const handleValidateCode = async () => {
		clearErrors("code");
		const code = getValues("code");
		if (!/^\d{6}$/.test(code)) {
			setError("code", { message: "O código deve ter 6 dígitos" });
			return;
		}
		try {
			await check.mutateAsync({ email, code });
			setCodeValidated(true);
		} catch (e) {
			setError("code", {
				message: e instanceof Error ? e.message : "Código inválido",
			});
		}
	};

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-3.5">
			<div>
				<span className="font-mono text-overline tracking-widest uppercase text-accent-bright block mb-2">
					Redefinir senha
				</span>
				<h1 className="text-2xl font-semibold tracking-tight m-0 mb-2 text-text-hi">
					{codeValidated ? "Defina sua nova senha" : "Verifique o código"}
				</h1>
				<p className="text-body text-text-md leading-prose mt-0 mb-6 max-w-[36ch]">
					{codeValidated ? (
						<>
							Crie uma nova senha para a conta{" "}
							<span className="text-text-hi font-medium">{email}</span>.
						</>
					) : (
						<>
							Enviamos um código de 6 dígitos para{" "}
							<span className="text-text-hi font-medium">{email}</span>. Digite
							o código para continuar.
						</>
					)}
				</p>
			</div>

			<input type="hidden" {...register("email")} />

			{!codeValidated && (
				<div className="flex flex-col items-center gap-1.5">
					<Controller
						control={control}
						name="code"
						render={({ field }) => (
							<InputOTP
								maxLength={6}
								pattern={REGEXP_ONLY_DIGITS}
								value={field.value}
								onChange={field.onChange}
							>
								<InputOTPGroup className="gap-1.5">
									{[0, 1, 2, 3, 4, 5].map((i) => (
										<InputOTPSlot
											key={i}
											index={i}
											className="bg-bg-2 border-border text-text-hi rounded-md size-10 first:rounded-md last:rounded-md border"
										/>
									))}
								</InputOTPGroup>
							</InputOTP>
						)}
					/>
					{errors.code && (
						<p className="text-body m-0 text-error self-start">
							{errors.code.message}
						</p>
					)}
				</div>
			)}

			{!codeValidated && (
				<Button
					variant="accent"
					type="button"
					disabled={check.isPending}
					onClick={handleValidateCode}
					className="w-full h-11 rounded-lg mt-5"
				>
					{check.isPending ? "Validando..." : "Validar código"}
				</Button>
			)}

			{codeValidated && (
				<>
					<div className="flex flex-col gap-1.5">
						<Label className="mono-label">Nova senha</Label>
						<div className="relative">
							<Input
								type={showPassword ? "text" : "password"}
								{...register("password")}
								placeholder="mínimo 8 caracteres"
								className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-11 pr-9"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-lo hover:text-text-md transition-colors"
								tabIndex={-1}
							>
								{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
							</button>
						</div>
						{errors.password && (
							<p className="text-body m-0 text-error">
								{errors.password.message}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label className="mono-label">Confirmar nova senha</Label>
						<div className="relative">
							<Input
								type={showConfirm ? "text" : "password"}
								{...register("confirmPassword")}
								placeholder="repita a nova senha"
								className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-11 pr-9"
							/>
							<button
								type="button"
								onClick={() => setShowConfirm((v) => !v)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-lo hover:text-text-md transition-colors"
								tabIndex={-1}
							>
								{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
							</button>
						</div>
						{errors.confirmPassword && (
							<p className="text-body m-0 text-error">
								{errors.confirmPassword.message}
							</p>
						)}
					</div>

					{mutation.error && (
						<p className="text-body m-0 text-error">{mutation.error.message}</p>
					)}

					<Button
						variant="accent"
						type="submit"
						disabled={mutation.isPending}
						className="w-full h-11 rounded-lg mt-1.5"
					>
						{mutation.isPending ? "Redefinindo..." : "Redefinir senha"}
					</Button>
				</>
			)}

			<p className="text-center text-caption text-text-lo mt-1">
				Não recebeu?{" "}
				<a
					href="/forgot-password"
					className="text-accent-bright font-semibold no-underline"
				>
					Solicitar novo código
				</a>
			</p>
		</form>
	);
}
