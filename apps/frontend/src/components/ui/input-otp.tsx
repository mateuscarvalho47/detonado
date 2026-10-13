import { OTPInput, OTPInputContext } from "input-otp";
import * as React from "react";

function InputOTP({
	className,
	containerClassName,
	...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
	return (
		<OTPInput
			data-slot="input-otp"
			containerClassName={containerClassName}
			spellCheck={false}
			className={className}
			{...props}
		/>
	);
}
const InputOTPGroup = ({
	className,
	...props
}: React.ComponentProps<"div">) => (
	<div data-slot="input-otp-group" className={className} {...props} />
);
function InputOTPSlot({
	index,
	className,
	...props
}: React.ComponentProps<"div"> & { index: number }) {
	const context = React.useContext(OTPInputContext);
	const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};
	return (
		<div
			data-slot="input-otp-slot"
			data-active={isActive}
			className={className}
			{...props}
		>
			{char}
			{hasFakeCaret && <div className="otp-caret" />}
		</div>
	);
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
