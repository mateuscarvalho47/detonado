import type { LibraryEntry } from "@/types/api";
import type { CompletionGoalValues } from "../schema/completionSchema";
export const COMPLETION_GOALS = [
	{ value: "MAIN", label: "Principal" },
	{ value: "EXTRAS", label: "+ Extras" },
	{ value: "COMPLETIONIST", label: "Completista" },
] as const;
export function completionEstimate(
	game: LibraryEntry,
	goal: CompletionGoalValues["completionGoal"],
) {
	if (goal === "EXTRAS") return game.hltbMainExtra;
	if (goal === "COMPLETIONIST") return game.hltbCompletionist;
	return game.hltbMain;
}
