/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			animation: {
				fadeIn: "fadeIn 1s ease-in-out",
			},
		},
	},
	//@ts-ignore
	plugins: [require("daisyui")],
	daisyui: {
		themes: ["dark", "light", "black", "business", "forest"],
	},
};

module.exports = config;
