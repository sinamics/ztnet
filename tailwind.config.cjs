/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			animation: {
				fadeIn: "fadeIn 0.2s ease-in-out",
			},
			screens: {
				'2xl-': {'max': '1400px'},
			},
		},
	},
	//@ts-ignore
	plugins: [require("daisyui")],
	daisyui: {
		themes: [
			"dark",
			"light",
			"black",
			"business",
			"forest",
			"sunset",
			"luxury",
			"night",
			"dim",
			"cyberpunk",
		],
	},
};

module.exports = config;
