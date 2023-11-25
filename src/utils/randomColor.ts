/**
 * Generates a random RGB color string. The generated color will have a total RGB value
 * less than or equal to a specified threshold to maintain a certain level of contrast.
 *
 * @returns {string} The RGB color string in the format: "rgb(r, g, b)"
 */

export const getRandomColor = () => {
	const maxRGBValue = 255;
	const highContrastThreshold = 300; // This can be adjusted to get the desired contrast

	let r = Math.floor(Math.random() * maxRGBValue);
	let g = Math.floor(Math.random() * (maxRGBValue - r));
	let b = Math.floor(highContrastThreshold - r - g);

	// Correct if sum exceeded the threshold due to flooring
	if (r + g + b > highContrastThreshold) {
		const excess = r + g + b - highContrastThreshold;
		if (b >= excess) {
			b -= excess;
		} else if (g + b >= excess) {
			g -= excess;
		} else {
			r -= excess;
		}
	}

	return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Converts an RGB color string to an RGBA color string by appending an alpha (opacity) value.
 *
 * @param {string} rgb - The RGB color string to be converted. Should be in the format: "rgb(r, g, b)"
 * @param {string} alpha - The alpha (opacity) value to be appended. Should be a number in string format between 0.0 (completely transparent) to 1.0 (completely opaque).
 *
 * @returns {string} The RGBA color string in the format: "rgba(r, g, b, a)"
 */
export const convertRGBtoRGBA = (rgb: string, alpha: number) => {
	return rgb.replace(")", `, ${alpha})`).replace("rgb", "rgba");
};

/**
 * Generates a consistent HSL color based on the input string.
 * This function calculates a unique hash from the given string and then converts this hash into a hue value.
 * The function always uses 100% saturation and 30% lightness, resulting in deep, vivid colors.
 *
 * @param {string} str - The input string from which the color is generated.
 * @returns {string} The HSL color string corresponding to the input string.
 */
export const stringToColor = (str) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}

	const h = hash % 360;
	return `hsl(${h}, 100%, 30%)`; // Using 100% saturation and 30% lightness for deep colors
};
