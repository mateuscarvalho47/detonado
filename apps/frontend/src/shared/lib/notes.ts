export function firstSentence(notes: string | null | undefined): string | null {
	const trimmed = notes?.trim();
	if (!trimmed) return null;
	const line = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? trimmed;
	const match = line.match(/^[\s\S]*?[.!?…](?=\s|$)/);
	const sentence = (match?.[0] ?? line).trim();
	return sentence || null;
}
