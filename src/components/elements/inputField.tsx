import { useTranslations } from "next-intl";
import React from "react";
import { useState, useRef, useEffect } from "react";
import Input from "~/components/elements/input";
import cn from "classnames";
interface FieldConfig {
	name: string;
	description?: string;
	initialValue?: string;
	type?: string;
	placeholder: string;
	displayValue?: string;
	defaultValue?: string | number | boolean;
	value?: string | number | boolean;
	elementType?: "input" | "select";
	selectOptions?: { value: string; label: string }[];
}

type SubmitHandlerType = (values: Record<string, string | boolean>) => Promise<unknown>;

interface FormProps {
	label: string;
	labelClassName?: string;
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
	openByDefault?: boolean;
	showSubmitButtons?: boolean;
	showCancelButton?: boolean;
	submitHandler: SubmitHandlerType;
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
	labelClassName,
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
	openByDefault = false,
	showSubmitButtons = true,
	showCancelButton = true,
}: FormProps) => {
	const t = useTranslations("changeButton");
	const [showInputs, setShowInputs] = useState(openByDefault);
	const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});

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

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		if (e.target.type === "checkbox") {
			// Check for the type
			const checked = (e.target as HTMLInputElement).checked;
			setFormValues((prevValues) => ({
				...prevValues,
				[e.target.name]: checked, // This will be a boolean: true or false
			}));
		} else {
			setFormValues((prevValues) => ({
				...prevValues,
				[e.target.name]: e.target.value,
			}));
		}
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
					<div onClick={handleEditClick} className={`cursor-pointer  ${labelStyle}`}>
						<div className="flex font-medium">
							<span>{label}</span>

							{headerBadge && (
								<span className={`badge badge-outline badge-${headerBadge.color} ml-2`}>
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
								<span className={`badge badge-outline badge-${badge.color} ml-2`}>
									{badge.text}
								</span>
							)}
						</div>
					</div>
					<div>
						<button
							data-testid="view-form"
							onClick={handleEditClick}
							className={cn(`btn btn-${size}`, { hidden: !showSubmitButtons })}
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
								<span className={`badge badge-outline badge-${headerBadge.color} ml-2`}>
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
												<label className={`text-sm text-gray-500 pt-2 ${labelClassName}`}>
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
										<div key={field.name} className="form-control">
											{field.description ? (
												<label className={`text-sm text-gray-500 pt-2 ${labelClassName}`}>
													{field.description}
												</label>
											) : null}
											<select
												ref={i === 0 ? selectRef : undefined}
												value={String(formValues[field.name])}
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
										</div>
									);
								}

								return (
									<div key={field.name} className="form-control">
										{field.description ? (
											<label className={`text-sm text-gray-500 pt-2 ${labelClassName}`}>
												{field.description}
											</label>
										) : null}
										<Input
											ref={i === 0 ? inputRef : undefined}
											type={field.type}
											key={field.name}
											placeholder={field.placeholder}
											value={String(formValues[field.name])}
											onChange={handleChange}
											name={field.name}
											className={`input-bordered input-${size} w-full`}
										/>
									</div>
								);
							})}
						</div>
					</div>
					<div className={cn("flex gap-3", { hidden: !showSubmitButtons })}>
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
									className={cn(`btn btn-${size} ${buttonClassName}`, {
										hidden: !showCancelButton,
									})}
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
