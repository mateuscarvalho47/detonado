import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMe } from "@/features/auth/hooks/useAuth";
import type { LibraryEntry } from "@/types/api";
import { suggestGames } from "../lib/suggestGames";
import {
	type SuggestionValues,
	suggestionSchema,
} from "../schema/suggestionSchema";

const EMPTY_FILTERS: SuggestionValues = {
	platform: "",
	genre: "",
	maxHours: "",
};
export function useSuggestions(library: LibraryEntry[]) {
	const { data: user } = useMe();
	const [filters, setFilters] = useState<SuggestionValues>(EMPTY_FILTERS);
	const form = useForm<SuggestionValues>({
		resolver: zodResolver(suggestionSchema),
		defaultValues: EMPTY_FILTERS,
	});
	const eligible = useMemo(
		() =>
			library.filter(
				(game) => game.status === "BACKLOG" || game.status === "PAUSED",
			),
		[library],
	);
	const platforms = useMemo(
		() =>
			[
				...new Set(
					eligible
						.map((game) => game.userPlatform)
						.filter((value): value is string => !!value),
				),
			].sort(),
		[eligible],
	);
	const genres = useMemo(
		() => [...new Set(eligible.flatMap((game) => game.genres))].sort(),
		[eligible],
	);
	const suggestions = useMemo(
		() => suggestGames(library, filters, user?.preferredPlatform),
		[library, filters, user?.preferredPlatform],
	);
	const unknownCount =
		filters.maxHours === ""
			? 0
			: eligible.filter(
					(game) =>
						game.hltbMain == null &&
						(!filters.platform || game.userPlatform === filters.platform) &&
						(!filters.genre || game.genres.includes(filters.genre)),
				).length;
	return {
		form,
		filters,
		suggestions,
		platforms,
		genres,
		unknownCount,
		preferredPlatform: user?.preferredPlatform,
		onSubmit: form.handleSubmit(setFilters),
		clear: () => {
			form.reset(EMPTY_FILTERS);
			setFilters(EMPTY_FILTERS);
		},
	};
}
