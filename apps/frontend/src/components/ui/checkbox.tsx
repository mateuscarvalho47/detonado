"use client";
import { CheckIcon } from "lucide-react";
import { Checkbox as Primitive } from "radix-ui";
import type * as React from "react";

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof Primitive.Root>) {
	return (
		<Primitive.Root data-slot="checkbox" className={className} {...props}>
			<Primitive.Indicator data-slot="checkbox-indicator">
				<CheckIcon />
			</Primitive.Indicator>
		</Primitive.Root>
	);
}

export { Checkbox };
