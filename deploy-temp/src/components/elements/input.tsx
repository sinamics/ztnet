import { ComponentPropsWithRef, forwardRef, useEffect, useState } from "react";
import cn from "classnames";
import { useTranslations } from "next-intl";

interface InputProps extends ComponentPropsWithRef<"input"> {
	useTooltip?: boolean;
	focus?: boolean;
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
			useTooltip = false,
			...rest
		}: InputProps,
		forwardedRef,
	) => {
		const t = useTranslations("input");
		const [isFocused, setIsFocused] = useState(false);
		const handleRef = (instance: HTMLInputElement | null) => {
			if (typeof forwardedRef === "function") {
				forwardedRef(instance);
			} else if (forwardedRef) {
				forwardedRef.current = instance;
			}
		};
		const handleFocus = () => {
			setIsFocused(true);
		};

		const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(false);
			if (onBlur) {
				onBlur(event);
			}
		};
		useEffect(() => {
			if (focus && forwardedRef && "current" in forwardedRef) {
				forwardedRef.current?.focus();
			}
		}, [focus, forwardedRef]);

		useEffect(() => {
			if (defaultValue && forwardedRef && "current" in forwardedRef && onChange) {
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
			<div
				className={cn("w-full", { tooltip: useTooltip && isFocused })}
				data-tip={t("enterToSave")}
			>
				<input
					name={name}
					defaultValue={defaultValue}
					value={value}
					onChange={onChange}
					onBlur={handleBlur}
					onFocus={handleFocus}
					className={`input ${className}`}
					ref={handleRef}
					{...rest}
				/>
			</div>
		);
	},
);
Input.displayName = "Input";
export default Input;
