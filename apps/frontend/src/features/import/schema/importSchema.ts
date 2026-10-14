import { z } from "zod";
export const importFileSchema = z
	.instanceof(File)
	.refine(
		(file) => file.size <= 1024 * 1024,
		"O arquivo deve ter no máximo 1 MB.",
	)
	.refine((file) => file.size > 0, "O arquivo está vazio.");
