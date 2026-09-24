import { cva, type VariantProps } from "class-variance-authority";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { GameStatus } from "@/types/api";

const badge = cva(
	"inline-flex items-center px-1.5 leading-none font-bold tracking-[0.06em] uppercase rounded-sm whitespace-nowrap",
	{
		variants: {
			size: {
				sm: "h-[16px] text-[10px]",
				md: "h-[18px] text-[11px]",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

type BadgeVariants = VariantProps<typeof badge>;

interface StatusBadgeProps extends BadgeVariants {
	status: GameStatus;
}

export function StatusBadge({ status, size }: StatusBadgeProps) {
	const def = STATUS_BY_KEY[status];
	const color = def.color;
	const bgColor = def.bgColor;
	const borderColor = def.borderColor;
	return (
		<span
			className={badge({ size })}
			style={{
				border: `1px solid ${borderColor}`,
				color,
				background: bgColor,
			}}
		>
			{def.label}
		</span>
	);
}
