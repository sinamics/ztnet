import React from "react";
// import clsx from "clsx";
// import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
// import HomepageFeatures from '@site/src/components/HomepageFeatures';

const LandingPage = (): JSX.Element => {
	const { siteConfig } = useDocusaurusContext();

	return (
		<header>
			<div className="scroll-up-btn">
				<i className="fas fa-angle-up"></i>
			</div>

			<section className="home">
				<div className="info-box">
					<div className="home-content">
						<h1 className="text-2">{siteConfig.tagline}</h1>
						<div className="nav-buttons">
							<a title="Goto github project" href="https://github.com/sinamics/ztnet">
								Github Project
							</a>
							<a
								title="Goto github project"
								style={{
									backgroundColor: "rgb(19, 19, 19)",
									borderColor: "rgb(44, 44, 44)",
								}}
								href="https://github.com/sinamics/ztnet#%EF%B8%8F-installations"
							>
								Installation
							</a>
						</div>
					</div>
				</div>
			</section>
		</header>
	);
};

export default function Home(): JSX.Element {
	const { siteConfig } = useDocusaurusContext();
	return (
		<Layout
			title={`Hello from ${siteConfig.title}`}
			description="Description will go into a meta tag in <head />"
		>
			<main>
				<LandingPage />
			</main>
		</Layout>
	);
}
