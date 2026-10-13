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
import styles from "./Auth.module.css";
export function VerifyResetForm({ email }: { email: string }) {
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
	async function validateCode() {
		clearErrors("code");
		const code = getValues("code");
		if (!/^\d{6}$/.test(code)) {
			setError("code", { message: "O código deve ter 6 dígitos" });
			return;
		}
		try {
			await check.mutateAsync({ email, code });
			setCodeValidated(true);
		} catch (error) {
			setError("code", {
				message: error instanceof Error ? error.message : "Código inválido",
			});
		}
	}
	return (
		<form onSubmit={onSubmit} className={styles.form}>
			<header className={styles.heading}>
				<span className={styles.eyebrow}>Redefinir senha</span>
				<h1 className={styles.title}>
					{codeValidated ? "Crie uma nova senha." : "Confira seu e-mail."}
				</h1>
				<p className={styles.intro}>
					{codeValidated
						? `Defina a nova senha de ${email}.`
						: `Digite o código de 6 dígitos enviado para ${email}.`}
				</p>
			</header>
			<input type="hidden" {...register("email")} />
			{!codeValidated ? (
				<>
					<div className={styles.field}>
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
									<InputOTPGroup className={styles.otp}>
										{[0, 1, 2, 3, 4, 5].map((index) => (
											<InputOTPSlot key={index} index={index} />
										))}
									</InputOTPGroup>
								</InputOTP>
							)}
						/>
						{errors.code && (
							<p className={styles.error}>{errors.code.message}</p>
						)}
					</div>
					<Button
						variant="accent"
						type="button"
						disabled={check.isPending}
						onClick={validateCode}
						className={styles.submit}
					>
						{check.isPending ? "Validando…" : "Validar código"}
					</Button>
				</>
			) : (
				<>
					<PasswordField
						id="new-password"
						label="Nova senha"
						shown={showPassword}
						setShown={setShowPassword}
						inputProps={register("password")}
						error={errors.password?.message}
					/>
					<PasswordField
						id="confirm-password"
						label="Confirmar nova senha"
						shown={showConfirm}
						setShown={setShowConfirm}
						inputProps={register("confirmPassword")}
						error={errors.confirmPassword?.message}
					/>
					{mutation.error && (
						<p className={styles.error}>{mutation.error.message}</p>
					)}
					<Button
						variant="accent"
						type="submit"
						disabled={mutation.isPending}
						className={styles.submit}
					>
						{mutation.isPending ? "Redefinindo…" : "Redefinir senha"}
					</Button>
				</>
			)}
			<p className={styles.centerLink}>
				<a href="/forgot-password">Solicitar novo código</a>
			</p>
		</form>
	);
}
function PasswordField({
	id,
	label,
	shown,
	setShown,
	inputProps,
	error,
}: {
	id: string;
	label: string;
	shown: boolean;
	setShown: (value: boolean) => void;
	inputProps: React.InputHTMLAttributes<HTMLInputElement>;
	error?: string;
}) {
	return (
		<div className={styles.field}>
			<Label htmlFor={id}>{label}</Label>
			<div className={styles.password}>
				<Input id={id} type={shown ? "text" : "password"} {...inputProps} />
				<button
					type="button"
					className={styles.reveal}
					onClick={() => setShown(!shown)}
					aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
				>
					{shown ? <EyeOff /> : <Eye />}
				</button>
			</div>
			{error && <p className={styles.error}>{error}</p>}
		</div>
	);
}
