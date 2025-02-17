// import { useTranslations } from "next-intl";
import PageLayout from "./pageLayout";

export default function NotFoundPage() {
	// const t = useTranslations("NotFoundPage");

	return (
		<PageLayout title="NotFound">
			<p className="max-w-[460px]">NotFound</p>
		</PageLayout>
	);
}
