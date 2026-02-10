import React, { useState, useRef, useEffect, useMemo } from "react";
import cn from "classnames";

interface IProps<T> {
	items: T[];
	placeholder: string;
	displayField: keyof T;
	idField: keyof T;
	className?: string;
	inputClassName?: string;
	onOptionSelect?: (value: T) => void;
	renderItem?: (item: T) => React.ReactNode;
	filterFunction?: (item: T, inputValue: string) => boolean;
}

function ScrollableDropdown<T>({
	items,
	placeholder,
	displayField,
	idField,
	className,
	inputClassName,
	onOptionSelect,
	renderItem,
	filterFunction,
}: IProps<T>) {
	const [inputValue, setInputValue] = useState("");
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const [filteredItems, setFilteredItems] = useState<T[]>(items);
	const dropdownRef = useRef<HTMLUListElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Memoize the items array
	const memoizedItems = useMemo(() => items, [items]);
	useEffect(() => {
		if (memoizedItems && memoizedItems.length > 0) {
			setFilteredItems(memoizedItems);
		}
	}, [memoizedItems]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				!dropdownRef.current?.contains(event.target as Node) &&
				!inputRef.current?.contains(event.target as Node)
			) {
				setIsDropdownVisible(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setInputValue(value);
		filterItems(value);
		setIsDropdownVisible(true);
	};

	const handleOptionClick = (item: T) => {
		setInputValue(item[displayField] as string);
		setIsDropdownVisible(false);
		if (onOptionSelect) {
			onOptionSelect(item);
		}
	};

	const toggleDropdown = () => {
		setIsDropdownVisible(!isDropdownVisible);
		if (!isDropdownVisible) {
			setInputValue("");
			setFilteredItems(items);
		}
	};

	const defaultFilterFunction = (item: T, value: string) =>
		String(item[displayField]).toLowerCase().includes(value.toLowerCase());

	const filterItems = (value: string) => {
		const filtered = items.filter(
			filterFunction
				? (item) => filterFunction(item, value)
				: (item) => defaultFilterFunction(item, value),
		);
		setFilteredItems(filtered);
	};
	return (
		<div className={cn("flex justify-between relative", className)} ref={containerRef}>
			<input
				ref={inputRef}
				type="text"
				className={cn(
					"input-bordered input input-sm pr-10 w-full cursor-pointer",
					inputClassName,
				)}
				placeholder={placeholder}
				value={inputValue}
				onChange={handleInputChange}
				onFocus={() => setIsDropdownVisible(true)}
			/>
			<button
				type="button"
				className="absolute right-2 top-1/2 transform -translate-y-1/2"
				onClick={toggleDropdown}
			>
				▼
			</button>
			{isDropdownVisible && (
				<ul
					ref={dropdownRef}
					className="absolute z-10 w-full bg-base-300 top-full left-0 max-h-60 overflow-auto border border-gray-800 rounded-md shadow custom-scrollbar text-sm"
				>
					{filteredItems?.map((item) => (
						<li
							key={String(item[idField])}
							tabIndex={0}
							className="p-2 cursor-pointer hover:bg-base-200"
							onClick={() => handleOptionClick(item)}
						>
							{renderItem ? renderItem(item) : String(item[displayField])}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export default ScrollableDropdown;
