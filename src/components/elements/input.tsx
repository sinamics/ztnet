import { forwardRef, useEffect } from "react";

interface InputProps {
	placeholder: string;
	value?: string | number;
	name: string;
	type: string;
	onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur?: (event: React.ChangeEvent<HTMLInputElement>) => void;
	ref?: React.RefObject<HTMLInputElement>;
	focus?: boolean;
	className?: string;
	defaultValue?: string | number;
	list?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			value,
			name,
			onChange,
			onBlur,
			className = "",
			defaultValue,
			focus = false,
			...rest
		}: InputProps,
		forwardedRef,
	) => {
		const handleRef = (instance: HTMLInputElement | null) => {
			if (typeof forwardedRef === "function") {
				forwardedRef(instance);
			} else if (forwardedRef) {
				forwardedRef.current = instance;
			}
		};

		useEffect(() => {
			if (focus && forwardedRef && "current" in forwardedRef) {
				forwardedRef.current?.focus();
			}
		}, [focus, forwardedRef]);

		useEffect(() => {
			if (
				defaultValue &&
				forwardedRef &&
				"current" in forwardedRef &&
				onChange
			) {
				const event = {
					target: {
						name: forwardedRef.current?.name || "",
						value: defaultValue,
					},
				};
				onChange(event as React.ChangeEvent<HTMLInputElement>);
			}
		}, [defaultValue, onChange, forwardedRef]);

		return (
			<input
				name={name}
				defaultValue={defaultValue}
				value={value}
				onChange={onChange}
				onBlur={onBlur}
				className={`input w-full max-w-xs ${className}`}
				ref={handleRef}
				{...rest}
			/>
		);
	},
);
Input.displayName = "Input";
export default Input;
