import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterForm, useResendVerification } from "../hooks/useAuth";

export function RegisterForm() {
	const { form, onSubmit, mutation: register } = useRegisterForm();
	const resend = useResendVerification();
	const [showPassword, setShowPassword] = useState(false);

	const {
		register: registerField,
		watch,
		formState: { errors },
	} = form;
	const email = watch("email");

	if (register.isSuccess) {
		return (
			<div className="flex flex-col gap-4">
				<div>
					<span className="font-mono text-overline tracking-widest uppercase text-accent-bright block mb-2">
						Verifique seu email
					</span>
					<h1 className="text-2xl font-semibold tracking-tight m-0 mb-2 text-text-hi">
						Quase lá!
					</h1>
					<p className="text-body text-text-md leading-prose mt-0 mb-2 max-w-[36ch]">
						Enviamos um link de confirmação para{" "}
						<span className="text-text-hi font-medium">{email}</span>. Clique no
						link para ativar sua conta.
					</p>
					<p className="text-caption text-text-lo leading-normal">
						Não recebeu? Verifique a pasta de spam.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Button
						variant="outline"
						disabled={resend.isPending || resend.isSuccess}
						onClick={() => resend.mutate(email)}
						className="w-full h-10 rounded-lg"
					>
						{resend.isPending ? "Enviando..." : "Reenviar email"}
					</Button>
					{resend.isSuccess && (
						<p className="text-caption m-0 text-text-md text-center">
							Novo link enviado para {email}.
						</p>
					)}
					{resend.error && (
						<p className="text-body m-0 text-error text-center">
							{resend.error.message}
						</p>
					)}
				</div>
				<p className="text-center text-caption text-text-lo mt-2">
					<a
						href="/login"
						className="text-accent-bright font-semibold no-underline"
					>
						Voltar ao login
					</a>
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-3.5">
			<div>
				<span className="font-mono text-overline tracking-widest uppercase text-accent-bright block mb-2">
					Crie sua conta
				</span>
				<h1 className="text-2xl font-semibold tracking-tight m-0 mb-2 text-text-hi">
					Começar a rastrear
				</h1>
				<p className="text-body text-text-md leading-prose mt-0 mb-6 max-w-[36ch]">
					Monte sua biblioteca de jogos pessoal.
				</p>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="mono-label">E-mail</Label>
				<Input
					type="email"
					{...registerField("email")}
					placeholder="seu@email.com"
					className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-11"
				/>
				{errors.email && (
					<p className="text-body m-0 text-error">{errors.email.message}</p>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="mono-label">Senha</Label>
				<div className="relative">
					<Input
						type={showPassword ? "text" : "password"}
						{...registerField("password")}
						placeholder="mínimo 8 caracteres"
						className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-10 pr-9"
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
					<p className="text-body m-0 text-error">{errors.password.message}</p>
				)}
			</div>

			<div className="flex items-start gap-2.5 mt-1">
				<Checkbox
					id="consent"
					className="mt-0.5 shrink-0"
					onCheckedChange={(checked) =>
						form.setValue(
							"consent",
							checked ? true : (undefined as unknown as true),
							{ shouldValidate: true },
						)
					}
				/>
				<label
					htmlFor="consent"
					className="text-caption text-text-lo leading-relaxed cursor-pointer"
				>
					Li e concordo com a{" "}
					<a
						href="/privacy"
						className="text-accent-bright no-underline hover:underline"
						target="_blank"
						rel="noreferrer"
					>
						Política de Privacidade
					</a>{" "}
					e os{" "}
					<a
						href="/terms"
						className="text-accent-bright no-underline hover:underline"
						target="_blank"
						rel="noreferrer"
					>
						Termos de Uso
					</a>
				</label>
			</div>
			{errors.consent && (
				<p className="text-body m-0 text-error">{errors.consent.message}</p>
			)}

			{register.error && (
				<p className="text-body m-0 text-error">{register.error.message}</p>
			)}

			<Button
				variant="accent"
				type="submit"
				disabled={register.isPending}
				className="w-full h-10 rounded-lg mt-1.5"
			>
				{register.isPending ? "Criando..." : "Criar conta"}
			</Button>

			<p className="text-center text-caption text-text-lo mt-1">
				Já tem conta?{" "}
				<a
					href="/login"
					className="text-accent-bright font-semibold no-underline"
				>
					Entrar
				</a>
			</p>
		</form>
	);
}
