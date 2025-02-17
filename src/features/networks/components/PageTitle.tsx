"use client";

import { useTranslations } from "next-intl";

export default function PageTitle() {
	const t = useTranslations("networks");

	return (
		<div className="mb-3 mt-3 flex w-full justify-center">
			<h5 className="w-full text-center text-2xl">{t("title")}</h5>
		</div>
	);
}
