import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
	it("uses the portuguese shelf labels", () => {
		render(
			<div>
				<StatusBadge status="WISHLIST" />
				<StatusBadge status="COMPLETED" />
				<StatusBadge status="PLAYING" />
			</div>,
		);
		expect(screen.getByText("Quero jogar")).toBeInTheDocument();
		expect(screen.getByText("Zerado")).toBeInTheDocument();
		expect(screen.getByText("Jogando")).toBeInTheDocument();
		expect(screen.queryByText("Wishlist")).not.toBeInTheDocument();
		expect(screen.queryByText("Completo")).not.toBeInTheDocument();
	});
});
