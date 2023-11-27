import React, { useState, useRef, useEffect } from "react";
import cn from "classnames";

interface Iprops {
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	items: Record<any, any>[];
	placeholder: string;
	displayField: string;
	valueField: string;
	className?: string;
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	onOptionSelect?: (value: any) => void;
}

const ScrollableDropdown = ({
	items,
	placeholder,
	displayField,
	valueField,
	className,
	onOptionSelect,
}: Iprops) => {
	const [inputValue, setInputValue] = useState({});
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const dropdownRef = useRef(null);
	const inputRef = useRef(null);
	const containerRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				!dropdownRef.current?.contains(event.target) &&
				!inputRef.current?.contains(event.target)
			) {
				setIsDropdownVisible(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleInputChange = (event) => {
		setInputValue(event.target.value);
		setIsDropdownVisible(true);
	};

	const handleOptionClick = (value) => {
		setInputValue(value);
		setIsDropdownVisible(false);
		if (onOptionSelect) {
			onOptionSelect(value);
		}
	};
	return (
		<form
			className={cn("flex justify-between", className)}
			onSubmit={(e) => e.preventDefault()}
		>
			<div ref={containerRef} className="relative w-full">
				<input
					ref={inputRef}
					type="text"
					className="input-bordered input-sm w-full"
					placeholder={placeholder}
					value={inputValue[displayField]}
					onChange={handleInputChange}
					onFocus={() => setIsDropdownVisible(true)}
				/>
				{isDropdownVisible && (
					<ul
						ref={dropdownRef}
						className="absolute mt-1 max-h-60 overflow-auto bg-base-200 border border-gray-800 rounded-md shadow custom-scrollbar text-sm"
						style={{
							width: containerRef.current ? containerRef.current.offsetWidth : "auto",
						}}
					>
						{items.map((item) => (
							<li
								key={item[valueField]}
								className="p-2 cursor-pointer hover:bg-gray-800"
								onClick={() => handleOptionClick(item)}
							>
								{item[displayField]}
							</li>
						))}
					</ul>
				)}
			</div>
		</form>
	);
};

export default ScrollableDropdown;
