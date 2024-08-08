import React, { useState, useRef, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { z } from "zod";

const TwoFactAuthSchema = z.object({
	code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

// type TwoFactAuthSchemaType = z.infer<typeof TwoFactAuthSchema>;

export default function TwoFactAuth({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [digits, setDigits] = useState<string[]>(
		value.split("").concat(Array(6 - value.length).fill("")),
	);
	const [error, setError] = useState<string | null>(null);
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const validateInput = (input: string) => {
		try {
			TwoFactAuthSchema.parse({ code: input });
			setError(null);
		} catch (err) {
			if (err instanceof z.ZodError) {
				setError(err.errors[0].message);
			}
		}
	};

	useEffect(() => {
		if (inputRefs.current[0]) {
			inputRefs.current[0].focus();
		}
		const handleAutofill = (e: Event) => {
			const input = e.target as HTMLInputElement;
			if (input.value.length === 6) {
				const newDigits = input.value.split("");
				updateDigits(newDigits);
				input.blur(); // Remove focus to prevent additional autofill attempts
			}
		};

		for (const input of inputRefs.current) {
			if (input) {
				input.addEventListener("input", handleAutofill);
			}
		}

		return () => {
			for (const input of inputRefs.current) {
				if (input) {
					input.removeEventListener("input", handleAutofill);
				}
			}
		};
	}, []);

	const updateDigits = (newDigits: string[]) => {
		setDigits(newDigits);
		const newValue = newDigits.join("");
		onChange(newValue);
		validateInput(newValue);
	};

	const handleChange = (index: number, newDigit: string) => {
		console.log(newDigit);
		if (/^[0-9]$/.test(newDigit) || newDigit === "") {
			const newDigits = [...digits];
			newDigits[index] = newDigit;
			updateDigits(newDigits);

			if (newDigit !== "" && index < 5) {
				inputRefs.current[index + 1]?.focus();
			}
		}
	};

	const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace" && digits[index] === "" && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text").slice(0, 6);
		const newDigits = pastedData.split("").concat(Array(6 - pastedData.length).fill(""));
		updateDigits(newDigits);
	};

	return (
		<div className="flex flex-col items-center py-5">
			<div className="flex justify-center gap-2">
				{digits.map((digit, index) => (
					<input
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						key={index}
						tabIndex={0}
						data-testid="totp-input-digit"
						name="totp"
						pattern="\d*"
						// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
						ref={(el) => (inputRefs.current[index] = el)}
						className="input input-bordered input-sm w-10 text-center"
						type="text"
						inputMode="numeric"
						maxLength={1}
						value={digit}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							handleChange(index, e.target.value)
						}
						onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
						onPaste={handlePaste}
						autoComplete={index === 0 ? "one-time-code" : "off"}
					/>
				))}
			</div>
			{error && <p className="text-sm text-error py-5">{error}</p>}
		</div>
	);
}
