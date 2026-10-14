import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
	type PreferencesValues,
	preferencesSchema,
} from "../schema/preferencesSchema";
import { useMe, usePlatforms, usePreferences } from "./useAuth";

export function usePreferencesForm() {
	const { data: user } = useMe();
	const catalog = usePlatforms();
	const mutation = usePreferences();
	const form = useForm<PreferencesValues>({
		resolver: zodResolver(preferencesSchema),
		values: { preferredPlatform: user?.preferredPlatform ?? null },
		resetOptions: { keepDirtyValues: true },
	});
	const value = form.watch("preferredPlatform") ?? "";
	const onSubmit = form.handleSubmit((values) => {
		mutation.mutate(values, { onSuccess: () => form.reset(values) });
	});
	function selectPlatform(value: string) {
		form.setValue("preferredPlatform", value || null, { shouldDirty: true });
		mutation.reset();
	}
	return { form, value, onSubmit, selectPlatform, catalog, mutation };
}
