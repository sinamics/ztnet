"use client";

import { useState, useEffect, useRef } from "react";

interface MultiSelectDropdownProps {
	formFieldName: string;
	value: string[];
	options: string[];
	onChange: (value: string[]) => void;
	prompt?: string;
}

export default function MultiSelectDropdown({
	formFieldName,
	value = [],
	options,
	onChange,
	prompt = "Select one or more options",
}: MultiSelectDropdownProps) {
	const [isJsEnabled, setIsJsEnabled] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState([]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const optionsListRef = useRef(null);
	const dropdownRef = useRef(null);

	useEffect(() => {
		setIsJsEnabled(true);
	}, []);

	useEffect(() => {
		setSelectedOptions(value);
	}, [value]);

	// Event listener to close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleChange = (e) => {
		const isChecked = e.target.checked;
		const option = e.target.value;

		const selectedOptionSet = new Set(selectedOptions);

		if (isChecked) {
			selectedOptionSet.add(option);
		} else {
			selectedOptionSet.delete(option);
		}

		const newSelectedOptions = Array.from(selectedOptionSet);

		setSelectedOptions(newSelectedOptions);
		onChange(newSelectedOptions);
	};

	const isSelectAllEnabled = selectedOptions.length < options.length;

	const handleSelectAllClick = (e) => {
		e.preventDefault();

		const optionsInputs = optionsListRef.current.querySelectorAll("input");
		// biome-ignore lint/complexity/noForEach: <explanation>
		optionsInputs.forEach((input) => {
			input.checked = true;
		});

		setSelectedOptions([...options]);
		onChange([...options]);
	};

	const isClearSelectionEnabled = selectedOptions.length > 0;

	const handleClearSelectionClick = (e) => {
		e.preventDefault();

		const optionsInputs = optionsListRef.current.querySelectorAll("input");
		// biome-ignore lint/complexity/noForEach: <explanation>
		optionsInputs.forEach((input) => {
			input.checked = false;
		});

		setSelectedOptions([]);
		onChange([]);
	};
	const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
	return (
		<label className="relative w-full" ref={dropdownRef}>
			<input type="checkbox" className="hidden peer" />

			<div
				onClick={toggleDropdown}
				className="w-full cursor-pointer after:content-['▼'] after:text-xs after:ml-1 after:inline-flex after:items-center peer-checked:after:-rotate-180 after:transition-transform inline-flex border border-gray-700 rounded-xl px-5 py-1"
			>
				{prompt}
				{isJsEnabled ? (
					<span className="ml-1 text-blue-500">{`(${selectedOptions.length} selected)`}</span>
				) : null}
			</div>
			{isDropdownOpen && (
				<div className="custom-scrollbar absolute badge-ghost rounded-sm border peer-checked:pointer-events-auto w-full max-h-60 overflow-y-scroll">
					{isJsEnabled && (
						<ul>
							<li>
								<button
									onClick={handleSelectAllClick}
									disabled={!isSelectAllEnabled}
									className="w-full btn-xs btn rounded-none btn-primary text-left px-2 py-1 disabled:opacity-50"
								>
									{"Select All"}
								</button>
							</li>
							<li>
								<button
									onClick={handleClearSelectionClick}
									disabled={!isClearSelectionEnabled}
									className="w-full btn-xs btn text-left px-2 py-1 disabled:opacity-50"
								>
									{"Clear selection"}
								</button>
							</li>
						</ul>
					)}
					<ul ref={optionsListRef}>
						{options.map((option) => {
							return (
								<li key={option}>
									<label className="flex items-center cursor-pointer px-2 py-1 select-none">
										<input
											type="checkbox"
											name={formFieldName}
											value={option}
											className="cursor-pointer checkbox checkbox-primary checkbox-xs"
											onChange={handleChange}
											checked={selectedOptions.includes(option)}
										/>
										<span className="ml-1 text-sm">{option}</span>
									</label>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</label>
	);
}
