import React, { ReactElement } from "react";

interface FormInputProps {
	label: string;
	name: string;
	type: string;
	value: string;
	onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder: string;
	disabled?: boolean;
	icon?: ReactElement;
}

const FormInput: React.FC<FormInputProps> = ({
	label,
	name,
	type,
	value,
	onChange,
	placeholder,
	disabled = false,
	icon,
}) => {
	return (
		<div className="space-y-2">
			<label className="text-sm font-medium tracking-wide" htmlFor={name}>
				{label}
			</label>
			<label className="input input-bordered flex items-center gap-2">
				{icon && React.cloneElement(icon, { className: "h-4 w-4 opacity-70" })}
				<input
					id={name}
					disabled={disabled}
					className="grow"
					value={value}
					onChange={onChange}
					type={type}
					name={name}
					placeholder={placeholder}
				/>
			</label>
		</div>
	);
};

export default FormInput;
