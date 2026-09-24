type StatusToken =
	| "bgActive"
	| "borderActive"
	| "textActive"
	| "bgPill"
	| "borderPill";

type TokenFn = (hue: number) => string;

const DARK_TOKENS: Record<StatusToken, TokenFn> = {
	bgActive: (h) => `oklch(0.3 0.06 ${h} / 0.35)`,
	borderActive: (h) => `oklch(0.6 0.15 ${h} / 0.5)`,
	textActive: (h) => `oklch(0.92 0.05 ${h})`,
	bgPill: (h) => `oklch(0.25 0.06 ${h} / 0.5)`,
	borderPill: (h) => `oklch(0.5 0.15 ${h} / 0.55)`,
};

export function statusColor(hue: number, token: StatusToken): string {
	return DARK_TOKENS[token](hue);
}
