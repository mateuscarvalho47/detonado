import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog";

describe("DialogClose", () => {
	it("preserves button styling attributes when rendered as a child", () => {
		render(
			<Dialog open>
				<DialogContent showCloseButton={false} aria-describedby={undefined}>
					<DialogTitle>Teste</DialogTitle>
					<DialogClose asChild>
						<Button variant="ghost" size="icon-sm" aria-label="Fechar">
							×
						</Button>
					</DialogClose>
				</DialogContent>
			</Dialog>,
		);

		const close = screen.getByRole("button", { name: "Fechar" });
		expect(close).toHaveAttribute("data-slot", "button");
		expect(close).toHaveAttribute("data-size", "icon-sm");
	});
});
