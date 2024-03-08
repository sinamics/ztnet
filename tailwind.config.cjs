/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			animation: {
				fadeIn: "fadeIn 0.2s ease-in-out",
			},
		},
	},
	//@ts-ignore
	plugins: [require("daisyui")],
	daisyui: {
		themes: ["dark", "light", "black", "business", "forest", "sunset", "luxury", "night", "dim"],
	},
};

module.exports = config;
