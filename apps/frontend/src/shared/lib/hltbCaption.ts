import type { HltbStatus } from "@/types/api";

export function hltbCaption(
	status: HltbStatus | null | undefined,
	hasTimes: boolean,
): string | null {
	if (status === "FOUND" || hasTimes) return null;
	if (status === "MISS") return "Sem tempo no HowLongToBeat.";
	if (status === "FAILED") return "A consulta ao HowLongToBeat falhou.";
	return "Tempo ainda não consultado.";
}
