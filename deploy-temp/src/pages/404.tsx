import Link from "next/link";
import { useTranslations } from "next-intl";
import { type GetStaticProps } from "next";

export default function FourOhFour() {
	const t = useTranslations("errorPages.404");

	return (
		<div className="min-h-screen hero bg-base-200">
			<div className="text-center hero-content">
				<div className="max-w-2xl">
					<div className="mb-8">
						<h1 className="mb-5 text-9xl font-bold text-primary select-none">
							{t("title")}
						</h1>
						<h2 className="mb-5 text-4xl font-bold">{t("heading")}</h2>
						<p className="mb-8 text-base-content/70">{t("description")}</p>
					</div>
					<Link href="/" className="btn btn-primary btn-lg">
						{t("goHome")}
					</Link>
				</div>
			</div>
		</div>
	);
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
	return {
		props: {
			messages: (await import(`~/locales/${locale}/common.json`)).default,
		},
	};
};
