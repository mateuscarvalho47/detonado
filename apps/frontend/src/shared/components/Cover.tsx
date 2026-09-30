import type { CSSProperties } from "react";

export type CoverScheme = "duotone" | "tritone" | "mono" | "split";
export type CoverSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

export interface CoverData {
	hue: number;
	scheme: CoverScheme;
	glyph: string;
}

interface CoverProps {
	game: {
		name: string;
		year?: number | null;
		platforms?: string[];
		cover: CoverData;
		coverUrl?: string;
	};
	size?: CoverSize;
	withTitle?: boolean;
	hover?: boolean;
	className?: string;
	style?: CSSProperties;
}

interface CoverColors {
	a: string;
	b: string;
	c: string;
	ink: string;
}

function coverColors({ hue, scheme }: CoverData): CoverColors {
	const h = hue;
	if (scheme === "mono") {
		return {
			a: `oklch(0.22 0.04 ${h})`,
			b: `oklch(0.32 0.06 ${h})`,
			c: `oklch(0.45 0.10 ${h})`,
			ink: `oklch(0.96 0.02 ${h})`,
		};
	}
	if (scheme === "duotone") {
		return {
			a: `oklch(0.28 0.16 ${h})`,
			b: `oklch(0.55 0.22 ${h})`,
			c: `oklch(0.78 0.20 ${(h + 30) % 360})`,
			ink: `oklch(0.98 0.02 ${h})`,
		};
	}
	if (scheme === "split") {
		return {
			a: `oklch(0.32 0.18 ${h})`,
			b: `oklch(0.50 0.22 ${(h + 180) % 360})`,
			c: `oklch(0.72 0.22 ${(h + 90) % 360})`,
			ink: `oklch(0.98 0.02 ${h})`,
		};
	}
	// tritone
	return {
		a: `oklch(0.30 0.20 ${h})`,
		b: `oklch(0.55 0.22 ${(h + 60) % 360})`,
		c: `oklch(0.78 0.22 ${(h + 130) % 360})`,
		ink: `oklch(0.98 0.02 ${h})`,
	};
}

function hashCode(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

const SIZES = {
	xs: { fs: 8, lh: 9, pad: 4, weight: 800, sub: 5, glyph: 32 },
	sm: { fs: 11, lh: 12, pad: 6, weight: 800, sub: 7, glyph: 44 },
	md: { fs: 16, lh: 17, pad: 10, weight: 800, sub: 9, glyph: 68 },
	lg: { fs: 22, lh: 23, pad: 14, weight: 800, sub: 10, glyph: 96 },
	xl: { fs: 30, lh: 32, pad: 18, weight: 800, sub: 11, glyph: 140 },
	hero: { fs: 48, lh: 48, pad: 28, weight: 800, sub: 13, glyph: 220 },
};

function resolveIgdbUrl(url: string, size: CoverSize): string {
	const token = size === "xl" || size === "hero" ? "t_1080p" : "t_cover_big_2x";
	return url.replace(/t_[a-z0-9_]+\//, `${token}/`);
}

export function Cover({
	game,
	size = "md",
	withTitle = true,
	hover = false,
	className,
	style,
}: CoverProps) {
	if (game.coverUrl) {
		return (
			<div
				className={`cv ${className ?? ""}`}
				data-hover={hover ? "1" : "0"}
				style={style}
			>
				<img
					src={resolveIgdbUrl(game.coverUrl, size)}
					alt={game.name}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
			</div>
		);
	}

	const c = coverColors(game.cover);
	const seed = hashCode(game.name);
	const xOff = 30 + (seed % 30);
	const yOff = 50 + ((seed >> 4) % 30);

	const words = game.name.split(" ");
	let lines: string[];
	if (words.length <= 1) lines = [game.name];
	else if (words.length === 2) lines = [words[0], words[1]];
	else if (words.length === 3) lines = [words[0], `${words[1]} ${words[2]}`];
	else lines = [words.slice(0, 2).join(" "), words.slice(2).join(" ")];

	const s = SIZES[size];

	return (
		<div
			className={`cv ${className ?? ""}`}
			data-hover={hover ? "1" : "0"}
			style={{
				background: `radial-gradient(120% 90% at ${xOff}% ${yOff}%, ${c.c} 0%, ${c.b} 35%, ${c.a} 100%)`,
				...style,
			}}
		>
			<div
				className="cv-glyph"
				style={{ fontSize: s.glyph, color: c.ink, opacity: 0.08 }}
			>
				{game.cover.glyph}
			</div>
			{withTitle && (
				<div className="cv-title" style={{ padding: s.pad, color: c.ink }}>
					<div className="cv-sub" style={{ fontSize: s.sub, opacity: 0.7 }}>
						{game.year ?? "TBA"}
						{game.platforms?.length ? ` · ${game.platforms[0]}` : ""}
					</div>
					<div
						className="cv-name"
						style={{
							fontSize: s.fs,
							lineHeight: `${s.lh}px`,
							fontWeight: s.weight,
						}}
					>
						{lines.map((ln) => (
							<div key={ln}>{ln}</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
