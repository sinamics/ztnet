import { useLocale } from "next-intl";
import { routing } from "~/i18n/routing";
import LocaleSwitcherSelect from "./localeSwitcherSelect";

export default function LocaleSwitcher() {
	// const t = useTranslations("LocaleSwitcher");
	const locale = useLocale();

	return (
		<LocaleSwitcherSelect defaultValue={locale} label="Switcher">
			{routing.locales.map((cur) => (
				<option key={cur} value={cur}>
					Switcher
				</option>
			))}
		</LocaleSwitcherSelect>
	);
}
