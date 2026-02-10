export const timeAgoFormatter = (value: number, unit: string, suffix: string) => {
	// Map full unit names to their abbreviations
	const unitAbbreviations: { [key: string]: string } = {
		second: "s",
		minute: "m",
		hour: "h",
		day: "d",
		week: "w",
		month: "mo",
		year: "yr",
	};

	const abbreviation = unitAbbreviations[unit] || unit;

	if (suffix === "ago") {
		return `${value} ${abbreviation} ago`;
	}
	if (suffix === "from now") {
		return `in ${value} ${abbreviation}`;
	}
	return `${value} ${abbreviation} ${suffix}`;
};
