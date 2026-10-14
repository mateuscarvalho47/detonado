import { z } from "zod";
export const completionGoalSchema = z.object({
	completionGoal: z.enum(["MAIN", "EXTRAS", "COMPLETIONIST"]),
});
export type CompletionGoalValues = z.infer<typeof completionGoalSchema>;
export const checklistSchema = z.object({
	text: z.string().trim().min(1, "Informe uma tarefa.").max(500),
});
export type ChecklistValues = z.infer<typeof checklistSchema>;
