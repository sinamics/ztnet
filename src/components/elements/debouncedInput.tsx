import { useEffect, useState, type InputHTMLAttributes } from "react";

// A debounced input react component
export const DebouncedInput = ({
	value: initialValue,
	onChange,
	debounce = 500,
	...props
}: {
	value: string | number;
	onChange: (value: string | number) => void;
	debounce?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange">) => {
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const timeout = setTimeout(() => {
			onChange(value);
		}, debounce);

		return () => clearTimeout(timeout);
	}, [value]);

	return (
		<input
			{...props}
			className="input input-bordered input-sm w-full max-w-xs"
			value={value}
			onChange={(e) => setValue(e.target.value)}
		/>
	);
};
