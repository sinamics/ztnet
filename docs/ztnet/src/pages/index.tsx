import React from "react";
// import clsx from "clsx";
// import Link from "@docusaurus/Link";
// import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

const LandingPage = (): JSX.Element => {
	return (
		<header>
			<div className="scroll-up-btn">
				<i className="fas fa-angle-up"></i>
			</div>

			<section className="home">
				<div className="info-box">
					<div className="home-content">
						<h2>ZTNET</h2>

						<h1 className="title-text">
							<span className="text-primary ">Zerotier </span>Controller Web UI
						</h1>
						<div className="nav-buttons">
							<a
								className="bg-primary bg-primary-outline main-button"
								title="Goto github project"
								href="/Installation/docker-compose"
							>
								Get Started
							</a>
							<a
								className="bg-primary-outline sm-hidden"
								title="Goto github project"
								href="https://github.com/sinamics/ztnet"
							>
								Github Project
							</a>
						</div>
					</div>
				</div>
			</section>
		</header>
	);
};

export default function Home(): JSX.Element {
	// const { siteConfig } = useDocusaurusContext();
	return (
		<Layout title="Docs" description="Description will go into a meta tag in <head />">
			<main>
				<LandingPage />
			</main>
		</Layout>
	);
}
