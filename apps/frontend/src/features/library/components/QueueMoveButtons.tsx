import { useMoveInQueue } from "../hooks/useLibrary";

interface QueueMoveButtonsProps {
	id: string;
	name: string;
	isFirst: boolean;
	isLast: boolean;
}

export function QueueMoveButtons({
	id,
	name,
	isFirst,
	isLast,
}: QueueMoveButtonsProps) {
	const move = useMoveInQueue();
	const pending = move.isPending && move.variables?.id === id;

	return (
		<div className="flex flex-col">
			<button
				type="button"
				aria-label={`Subir ${name}`}
				disabled={isFirst || pending}
				onClick={() => move.mutate({ id, direction: "up" })}
				className="flex items-center justify-center size-7 bg-transparent border border-border-soft text-text-md text-caption cursor-pointer disabled:opacity-30 disabled:cursor-default"
			>
				↑
			</button>
			<button
				type="button"
				aria-label={`Descer ${name}`}
				disabled={isLast || pending}
				onClick={() => move.mutate({ id, direction: "down" })}
				className="flex items-center justify-center size-7 bg-transparent border border-t-0 border-border-soft text-text-md text-caption cursor-pointer disabled:opacity-30 disabled:cursor-default"
			>
				↓
			</button>
		</div>
	);
}
