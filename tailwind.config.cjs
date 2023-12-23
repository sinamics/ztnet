/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {},
	},
	//@ts-ignore
	plugins: [require("daisyui")],
	// daisyUI config (optional)
	// daisyui: {
	//   styled: true,
	//   themes: true,
	//   base: true,
	//   utils: true,
	//   logs: true,
	//   rtl: false,
	//   prefix: "",
	//   darkTheme: "dark",
	// },
	daisyui: {
		themes: [
			{
				dark: {
					primary: "#7e22ce",
					"primary-focus": "#711eb9",
					"primary-content": "#ffffff",
					secondary: "#e5e7eb",
					"secondary-focus": "#bd0091",
					"secondary-content": "#ffffff",
					accent: "#37cdbe",
					"accent-focus": "#2aa79b",
					"accent-content": "#ffffff",
					neutral: "#2a2e37",
					"neutral-focus": "#16181d",
					"neutral-content": "#ffffff",
					"base-100": "#1A1A1B",
					"base-200": "#2D2D2E",
					"base-300": "#59595A",
					"base-400": "#59595A",
					"base-content": "#ebecf0",
					info: "#66c6ff",
					success: "#87d039",
					warning: "#e2d562",
					error: "#ff6f6f",
				},
			},
			"light",
			"black",
			"business",
			"forest",
		],
	},
};

module.exports = config;
