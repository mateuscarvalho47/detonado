import { useBlocker } from "@tanstack/react-router";

export function useUnsavedChanges(dirty: boolean) {
	useBlocker({
		shouldBlockFn: ({ current, next }) =>
			current.pathname !== next.pathname &&
			dirty &&
			!window.confirm("Há alterações não salvas. Sair e descartá-las?"),
		enableBeforeUnload: dirty,
	});
}
