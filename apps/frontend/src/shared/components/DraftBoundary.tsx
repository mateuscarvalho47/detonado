import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { useUnsavedChanges } from "@/shared/hooks/useUnsavedChanges";

type Drafts = Record<string, string>;
const DraftContext = createContext<{
	drafts: Drafts;
	register: (id: string, group: string, dirty: boolean) => void;
} | null>(null);

export function DraftBoundary({ children }: PropsWithChildren) {
	const [drafts, setDrafts] = useState<Drafts>({});
	const register = useCallback((id: string, group: string, dirty: boolean) => {
		setDrafts((current) => {
			if ((current[id] === group) === dirty) return current;
			const next = { ...current };
			if (dirty) next[id] = group;
			else delete next[id];
			return next;
		});
	}, []);
	useUnsavedChanges(Object.keys(drafts).length > 0);
	const value = useMemo(() => ({ drafts, register }), [drafts, register]);
	return <DraftContext value={value}>{children}</DraftContext>;
}

// Outside the application shell (for isolated editors/tests), registration is optional.
export function useDraftRegistration(group: string, dirty: boolean) {
	const register = useContext(DraftContext)?.register;
	const id = useId();
	useEffect(() => {
		register?.(id, group, dirty);
	}, [register, id, group, dirty]);
	useEffect(() => () => register?.(id, group, false), [register, id, group]);
}
export function useOtherDrafts(exclude: string) {
	const context = useContext(DraftContext);
	return Object.values(context?.drafts ?? {}).some(
		(group) => group !== exclude,
	);
}
