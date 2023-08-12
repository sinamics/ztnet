import { useTranslations } from "next-intl";
import React from "react";
import { useState, useRef, useEffect } from "react";
import Input from "~/components/elements/input";

interface FieldConfig {
	name: string;
	description?: string;
	initialValue?: string;
	type?: string;
	placeholder: string;
	displayValue?: string;
	defaultValue?: string | number;
	value?: string | number;
	elementType?: "input" | "select";
	selectOptions?: { value: string; label: string }[];
}

interface FormProps {
	label: string;
	isLoading?: boolean;
	placeholder?: string;
	description?: string;
	fields: FieldConfig[];
	size?: "xs" | "sm" | "md" | "lg";
	buttonClassName?: string;
	rootClassName?: string;
	rootFormClassName?: string;
	labelStyle?: string;
	buttonText?: string;
	submitHandler: (formValues: {
		[key: string]: string;
	}) => Promise<unknown> | string | void;
	badge?: {
		text: string;
		color: string;
	};
	headerBadge?: {
		text: string;
		color: string;
	};
}

const InputField = ({
	label,
	placeholder,
	description,
	fields,
	submitHandler,
	badge,
	headerBadge,
	isLoading,
	size = "md",
	buttonClassName,
	rootClassName,
	rootFormClassName,
	labelStyle,
	buttonText,
}: FormProps) => {
	const t = useTranslations("changeButton");
	const [showInputs, setShowInputs] = useState(false);

	const [formValues, setFormValues] = useState<Record<string, string>>({});
	// Create a new ref
	const inputRef = useRef<HTMLInputElement>(null);
	const selectRef = useRef<HTMLSelectElement>(null);

	useEffect(() => {
		setFormValues(
			fields.reduce((acc, field) => {
				let value;
				if (field.type === "checkbox") {
					value = !!field.value || !!field.initialValue;
				} else {
					value = field.value || field.initialValue || "";
				}
				acc[field.name] = value;
				return acc;
			}, {}),
		);
	}, [fields]);

	useEffect(() => {
		// When showInputs is true, focus the appropriate field based on its type
		if (showInputs) {
			if (fields[0].type === "select") {
				selectRef.current?.focus();
			} else {
				inputRef.current?.focus();
			}
		}
	}, [showInputs, fields]);

	const handleEditClick = () => setShowInputs(!showInputs);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const value =
			e.target.type === "checkbox" ? e.target.checked : e.target.value;
		setFormValues((prevValues) => ({
			...prevValues,
			[e.target.name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const response = await submitHandler(formValues);
		if (response) {
			setShowInputs(false);
		}
	};

	const renderLoading = () => (
		<div className="mt-1 text-sm">
			<progress className="progress w-56"></progress>
		</div>
	);

	return (
		<>
			{!showInputs ? (
				<div className="flex w-full justify-between">
					<div
						onClick={handleEditClick}
						className={`cursor-pointer  ${labelStyle}`}
					>
						<div className="flex font-medium">
							<span>{label}</span>

							{headerBadge && (
								<span
									className={`badge badge-outline badge-${headerBadge.color} ml-2`}
								>
									{headerBadge.text}
								</span>
							)}
						</div>
						<div>
							{description ? (
								<p className="m-0 p-0 text-xs text-gray-500">{description}</p>
							) : null}
						</div>
						<div className="text-gray-500">
							{placeholder ?? fields[0].placeholder}
							{badge && (
								<span
									className={`badge badge-outline badge-${badge.color} ml-2`}
								>
									{badge.text}
								</span>
							)}
						</div>
					</div>
					<div>
						<button
							data-testid="view-form"
							onClick={handleEditClick}
							className={`btn btn-${size}`}
						>
							{buttonText || t("change")}
						</button>
					</div>
				</div>
			) : (
				<form
					onSubmit={(event) => {
						void handleSubmit(event);
					}}
					className={`flex w-full justify-between ${rootClassName}`}
				>
					<div>
						<div className="flex font-medium">
							<span>{label}</span>

							{headerBadge && (
								<span
									className={`badge badge-outline badge-${headerBadge.color} ml-2`}
								>
									{headerBadge.text}
								</span>
							)}
						</div>
						<div>
							{description ? (
								<p className="m-0 p-0 text-xs text-gray-500">{description}</p>
							) : null}
						</div>
						<div className={rootFormClassName}>
							{fields.map((field, i) => {
								if (field.type === "checkbox") {
									return (
										<div key={field.name} className="form-control">
											{field.description ? (
												<label className="text-sm text-gray-500 leading-none pt-2">
													{field.description}
												</label>
											) : null}
											<label className="label cursor-pointer">
												<input
													ref={i === 0 ? inputRef : undefined}
													type="checkbox"
													name={field.name}
													checked={!!formValues[field.name]}
													onChange={handleChange}
													className="checkbox checkbox-primary"
												/>
												<span>{field.placeholder}</span>
											</label>
										</div>
									);
								}
								if (field.elementType === "select" && field.selectOptions) {
									return (
										<React.Fragment key={field.name}>
											{field.description ? (
												<label className="text-sm text-gray-500 leading-none pt-2">
													{field.description}
												</label>
											) : null}
											<select
												ref={i === 0 ? selectRef : undefined}
												value={formValues[field.name]}
												onChange={handleChange}
												name={field.name}
												className={`select select-bordered select-${size}`}
											>
												{field.selectOptions.map((option) => (
													<option value={option.value} key={option.value}>
														{option.label}
													</option>
												))}
											</select>
										</React.Fragment>
									);
								}

								return (
									<React.Fragment key={field.name}>
										{field.description ? (
											<label className="text-sm text-gray-500 leading-none pt-2">
												{field.description}
											</label>
										) : null}
										<Input
											ref={i === 0 ? inputRef : undefined}
											type={field.type}
											key={field.name}
											placeholder={field.placeholder}
											value={formValues[field.name]}
											onChange={handleChange}
											name={field.name}
											className={`input-bordered input-${size} w-full`}
										/>
									</React.Fragment>
								);
							})}
						</div>
					</div>
					<div className="flex gap-3">
						{isLoading ? (
							renderLoading()
						) : (
							<>
								<button
									className={`btn btn-primary btn-${size} ${buttonClassName}`}
									type="submit"
								>
									{t("submit")}
								</button>
								<button
									className={`btn btn-${size} ${buttonClassName}`}
									onClick={(e) => {
										e.preventDefault();
										handleEditClick();
									}}
								>
									{t("cancel")}
								</button>
							</>
						)}
					</div>
				</form>
			)}
		</>
	);
};

export default InputField;
