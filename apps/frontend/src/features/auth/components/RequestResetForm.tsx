import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestResetForm } from "../hooks/useAuth";

export function RequestResetForm() {
	const navigate = useNavigate();
	const { form, onSubmit, mutation } = useRequestResetForm((email) =>
		navigate({ to: "/reset-password", search: { email } }),
	);

	const {
		register,
		formState: { errors },
	} = form;

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-3.5">
			<div>
				<span className="font-mono text-overline tracking-widest uppercase text-accent-bright block mb-2">
					Recuperar acesso
				</span>
				<h1 className="text-2xl font-semibold tracking-tight m-0 mb-2 text-text-hi">
					Esqueceu sua senha?
				</h1>
				<p className="text-body text-text-md leading-prose mt-0 mb-6 max-w-[36ch]">
					Informe seu e-mail e enviaremos um código para você redefinir sua
					senha.
				</p>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="mono-label">E-mail</Label>
				<Input
					type="email"
					{...register("email")}
					placeholder="seu@email.com"
					className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-11"
				/>
				{errors.email && (
					<p className="text-body m-0 text-error">{errors.email.message}</p>
				)}
			</div>

			{mutation.error && (
				<p className="text-body m-0 text-error">{mutation.error.message}</p>
			)}

			<Button
				variant="accent"
				type="submit"
				disabled={mutation.isPending}
				className="w-full h-10 rounded-lg mt-1.5"
			>
				{mutation.isPending ? "Enviando..." : "Enviar código"}
			</Button>

			<p className="text-center text-caption text-text-lo mt-1">
				Lembrou a senha?{" "}
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
