"use client";
import { XIcon } from "lucide-react";
import { Dialog as Primitive } from "radix-ui";
import type * as React from "react";
import { Button } from "@/components/ui/button";

const Dialog = (props: React.ComponentProps<typeof Primitive.Root>) => (
	<Primitive.Root data-slot="dialog" {...props} />
);
const DialogTrigger = (
	props: React.ComponentProps<typeof Primitive.Trigger>,
) => <Primitive.Trigger data-slot="dialog-trigger" {...props} />;
const DialogPortal = (props: React.ComponentProps<typeof Primitive.Portal>) => (
	<Primitive.Portal data-slot="dialog-portal" {...props} />
);
function DialogClose({
	asChild,
	...props
}: React.ComponentProps<typeof Primitive.Close>) {
	if (asChild) return <Primitive.Close asChild {...props} />;
	return <Primitive.Close data-slot="dialog-close" {...props} />;
}
function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof Primitive.Overlay>) {
	return (
		<Primitive.Overlay
			data-slot="dialog-overlay"
			className={className}
			{...props}
		/>
	);
}
function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof Primitive.Content> & {
	showCloseButton?: boolean;
}) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<Primitive.Content
				data-slot="dialog-content"
				className={className}
				{...props}
			>
				{children}
				{showCloseButton && (
					<Primitive.Close data-slot="dialog-close" asChild>
						<Button variant="ghost" size="icon-sm">
							<XIcon />
							<span className="sr-only">Fechar</span>
						</Button>
					</Primitive.Close>
				)}
			</Primitive.Content>
		</DialogPortal>
	);
}
const DialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div data-slot="dialog-header" className={className} {...props} />
);
function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
	return (
		<div data-slot="dialog-footer" className={className} {...props}>
			{children}
			{showCloseButton && (
				<Primitive.Close asChild>
					<Button variant="outline">Fechar</Button>
				</Primitive.Close>
			)}
		</div>
	);
}
const DialogTitle = ({
	className,
	...props
}: React.ComponentProps<typeof Primitive.Title>) => (
	<Primitive.Title data-slot="dialog-title" className={className} {...props} />
);
const DialogDescription = ({
	className,
	...props
}: React.ComponentProps<typeof Primitive.Description>) => (
	<Primitive.Description
		data-slot="dialog-description"
		className={className}
		{...props}
	/>
);

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
