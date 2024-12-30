"use client";
import { ThemeProvider } from "next-themes";

// theme provider
const ZtnetThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <ThemeProvider>{children}</ThemeProvider>;
};

export default ZtnetThemeProvider;
