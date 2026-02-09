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
			colors: {
				'eitek-blue': '#1e74be',
				'eitek-light': '#4a9eff',
				'eitek-dark': '#0d4f8c',
			},
		},
	},
	//@ts-ignore
	plugins: [require("daisyui")],
	daisyui: {
		themes: [
			{
				eitek: {
					"primary": "#1e74be", // EITEK Blue
					"primary-content": "#ffffff",
					"secondary": "#4a9eff", // Light Blue  
					"secondary-content": "#ffffff",
					"accent": "#09883e", // Dark Blue
					"accent-content": "#ffffff",
					"neutral": "#2a323c",
					"neutral-content": "#a6adbb",
					"base-100": "#ffffff",
					"base-200": "#f2f7ff", // Very light blue tint
					"base-300": "#e5f0ff",
					"base-content": "#0a2346",
					"info": "#3abff8",
					"success": "#36d399",
					"warning": "#fbbd23",
					"error": "#f87272",
				}
			},
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
