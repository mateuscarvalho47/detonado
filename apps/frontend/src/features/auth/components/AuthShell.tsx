import type { ReactNode } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

interface AuthShellProps {
	mode?: "login" | "register";
	children?: ReactNode;
}

export function AuthShell({ mode, children }: AuthShellProps) {
	return (
		<div className="min-h-screen flex items-center justify-center px-5 py-10 bg-bg-0">
			<div className="w-full max-w-105 border border-border-soft bg-bg-1 p-8">
				<div className="flex items-center gap-2.5 mb-7">
					<img src="/logo.svg" alt="" width="22" height="22" />
					<span className="text-title font-semibold tracking-tight text-text-hi">
						Detonado
					</span>
				</div>

				{children ?? (mode === "login" ? <LoginForm /> : <RegisterForm />)}

				<div className="mt-5 pt-4 border-t border-border-soft font-mono text-overline text-text-dim text-center">
					Detonado · biblioteca pessoal
				</div>
			</div>
		</div>
	);
}
