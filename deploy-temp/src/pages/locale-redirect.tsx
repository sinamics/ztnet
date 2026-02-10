import { useEffect } from "react";
import { useRouter } from "next/router";

const LocaleRedirect = () => {
	const router = useRouter();

	useEffect(() => {
		// Wait for router to be ready
		if (!router.isReady) {
			return;
		}

		// Get all query parameters
		const { query } = router;

		// Get the target path from query parameter, default to '/auth/register'
		const targetPath = (query.target as string) || "/auth/register";

		// Remove the target parameter from the query to avoid passing it along
		const { target, ...restQuery } = query;

		// Get the user's preferred language from browser
		const userLanguage = navigator.language || navigator.languages?.[0] || "en";

		// Map browser language codes to your supported locales
		const supportedLocales = ["en", "fr", "no", "pl", "zh-tw", "zh", "es", "ru"];
		const defaultLocale = "en";

		// Language variant mappings for common browser language codes
		const languageVariantMap: Record<string, string> = {
			// Norwegian variants
			nb: "no", // Norwegian Bokmål
			nn: "no", // Norwegian Nynorsk
			"nb-no": "no",
			"nn-no": "no",

			// Chinese variants
			"zh-cn": "zh", // Simplified Chinese (China)
			"zh-sg": "zh", // Simplified Chinese (Singapore)
			"zh-tw": "zh-tw", // Traditional Chinese (Taiwan)
			"zh-hk": "zh-tw", // Traditional Chinese (Hong Kong)
			"zh-mo": "zh-tw", // Traditional Chinese (Macau)

			// Spanish variants
			"es-es": "es", // Spanish (Spain)
			"es-mx": "es", // Spanish (Mexico)
			"es-ar": "es", // Spanish (Argentina)
			"es-co": "es", // Spanish (Colombia)
			"es-pe": "es", // Spanish (Peru)
			"es-ve": "es", // Spanish (Venezuela)
			"es-cl": "es", // Spanish (Chile)
			"es-ec": "es", // Spanish (Ecuador)
			"es-gt": "es", // Spanish (Guatemala)
			"es-uy": "es", // Spanish (Uruguay)

			// French variants
			"fr-fr": "fr", // French (France)
			"fr-ca": "fr", // French (Canada)
			"fr-be": "fr", // French (Belgium)
			"fr-ch": "fr", // French (Switzerland)

			// English variants
			"en-us": "en", // English (United States)
			"en-gb": "en", // English (United Kingdom)
			"en-ca": "en", // English (Canada)
			"en-au": "en", // English (Australia)
			"en-nz": "en", // English (New Zealand)
			"en-za": "en", // English (South Africa)

			// Polish variants
			"pl-pl": "pl", // Polish (Poland)

			// Russian variants
			"ru-ru": "ru", // Russian (Russia)
			"ru-by": "ru", // Russian (Belarus)
			"ru-kz": "ru", // Russian (Kazakhstan)
			"ru-kg": "ru", // Russian (Kyrgyzstan)
		};

		let preferredLocale = defaultLocale;

		// Check for exact match first
		const normalizedLang = userLanguage.toLowerCase();
		if (supportedLocales.includes(normalizedLang)) {
			preferredLocale = normalizedLang;
		} else if (languageVariantMap[normalizedLang]) {
			// Check language variant map
			preferredLocale = languageVariantMap[normalizedLang];
		} else {
			// Fallback: Check for language family match (e.g., 'de-DE' -> 'de')
			const languageCode = normalizedLang.split("-")[0];
			if (supportedLocales.includes(languageCode)) {
				preferredLocale = languageCode;
			} else if (languageVariantMap[languageCode]) {
				preferredLocale = languageVariantMap[languageCode];
			}
		}

		// Build the redirect URL with the preferred locale
		const searchParams = new URLSearchParams();

		// Add all remaining query parameters
		for (const [key, value] of Object.entries(restQuery)) {
			if (value) {
				searchParams.set(key, value as string);
			}
		}

		const queryString = searchParams.toString();
		let redirectPath: string;

		if (preferredLocale === defaultLocale) {
			redirectPath = `${targetPath}${queryString ? `?${queryString}` : ""}`;
		} else {
			redirectPath = `/${preferredLocale}${targetPath}${queryString ? `?${queryString}` : ""}`;
		}

		// Redirect to the localized version
		router.replace(redirectPath);
	}, [router.isReady, router]);

	// Show a simple loading message while redirecting
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
				<p>Redirecting...</p>
			</div>
		</div>
	);
};

export default LocaleRedirect;
