/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {},
	},
	//@ts-ignore
	plugins: [require("daisyui")],
	daisyui: {
		themes: ["dark", "light", "black", "business", "forest"],
	},
};

module.exports = config;
