import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

const Themes = [
	"light",
	"dark",
	"system",
	"black",
	"business",
	"forest",
	"sunset",
	"luxury",
	"night",
	"dim",
	"cyberpunk",
];

const ThemeSwitch = () => {
	const [mounted, setMounted] = useState(false);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<div className="dropdown dropdown-end">
			<label tabIndex={0} className="btn btn-primary btn-sm m-1">
				{theme?.toUpperCase()}
			</label>
			<ul
				tabIndex={0}
				className="menu dropdown-content rounded-box z-30 w-52 bg-base-300 p-2 shadow"
			>
				{Themes.map((theme) => {
					return (
						<li key={theme} onClick={() => setTheme(theme)}>
							<a>{theme.toUpperCase()}</a>
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export default ThemeSwitch;
