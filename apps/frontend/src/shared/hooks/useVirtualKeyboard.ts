import { useEffect, useState } from "react";

export function useVirtualKeyboard() {
	const [open, setOpen] = useState(false);
	useEffect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		let fullHeight = viewport.height;
		let keyboardOpen = false;
		const measure = () => {
			const field = document.activeElement;
			const editing =
				field instanceof HTMLTextAreaElement ||
				(field instanceof HTMLInputElement &&
					!["checkbox", "radio", "range", "button", "submit"].includes(
						field.type,
					));
			const shrunk = fullHeight - viewport.height > 150;
			keyboardOpen = shrunk && (editing || keyboardOpen);
			if (!keyboardOpen && !editing) fullHeight = viewport.height;
			setOpen(keyboardOpen);
		};
		const orientation = () => {
			fullHeight = viewport.height;
			keyboardOpen = false;
			setOpen(false);
		};
		viewport.addEventListener("resize", measure);
		document.addEventListener("focusin", measure);
		document.addEventListener("focusout", measure);
		window.addEventListener("orientationchange", orientation);
		return () => {
			viewport.removeEventListener("resize", measure);
			document.removeEventListener("focusin", measure);
			document.removeEventListener("focusout", measure);
			window.removeEventListener("orientationchange", orientation);
		};
	}, []);
	return open;
}
