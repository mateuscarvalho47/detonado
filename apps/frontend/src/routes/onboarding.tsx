import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCompleteOnboarding } from "@/features/auth/hooks/useAuth";
import { usePreferencesForm } from "@/features/auth/hooks/usePreferencesForm";
import { AccountSteamSection } from "@/features/steam/components/AccountSteamSection";
import { useUnsavedChanges } from "@/shared/hooks/useUnsavedChanges";
import styles from "@/styles/Routes.module.css";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});
function OnboardingPage() {
	const complete = useCompleteOnboarding();
	const preferences = usePreferencesForm();
	const navigate = useNavigate();
	const dirty = preferences.form.formState.isDirty;
	useUnsavedChanges(dirty);
	const finish = preferences.form.handleSubmit(async (values) => {
		try {
			if (dirty) {
				await preferences.mutation.mutateAsync(values);
				preferences.form.reset(values);
			}
			await complete.mutateAsync();
			await navigate({ to: "/library", search: {}, ignoreBlocker: true });
		} catch {
			/* The mutation errors are displayed below; stay on this page. */
		}
	});
	return (
		<div className={styles.accountPage}>
			<h1>Personalize sua biblioteca</h1>
			<p>
				Plataforma e Steam são opcionais. Você pode ajustar tudo depois em
				Configurações.
			</p>
			<form onSubmit={finish}>
				<label htmlFor="onboarding-platform">Plataforma preferida</label>
				<select
					id="onboarding-platform"
					value={preferences.value}
					disabled={
						preferences.catalog.isLoading || preferences.mutation.isPending
					}
					onChange={(event) => preferences.selectPlatform(event.target.value)}
				>
					<option value="">Sem preferência</option>
					{preferences.value &&
						!preferences.catalog.data?.platforms.includes(
							preferences.value,
						) && <option>{preferences.value}</option>}
					{preferences.catalog.data?.platforms.map((platform) => (
						<option key={platform}>{platform}</option>
					))}
				</select>
				<p>
					Preenche a plataforma ao adicionar jogos compatíveis. A escolha será
					salva ao continuar.
				</p>
				{preferences.catalog.isError && (
					<p role="alert">
						{preferences.catalog.error.message} Você pode continuar sem
						preferência.{" "}
						<Button
							type="button"
							variant="ghost"
							onClick={() => void preferences.catalog.refetch()}
						>
							Tentar novamente
						</Button>
					</p>
				)}
				{preferences.mutation.isError && (
					<p role="alert">{preferences.mutation.error.message}</p>
				)}
				<Button
					type="submit"
					variant="accent"
					disabled={complete.isPending || preferences.mutation.isPending}
				>
					{complete.isPending || preferences.mutation.isPending
						? "Salvando…"
						: "Continuar para minha biblioteca"}
				</Button>
				{complete.isError && <p role="alert">{complete.error.message}</p>}
			</form>
			<AccountSteamSection returnTo="/onboarding" />
		</div>
	);
}
