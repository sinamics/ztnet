import React from "react";
// import clsx from "clsx";
// import Link from "@docusaurus/Link";
// import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

const LandingPage = (): JSX.Element => {
	return (
		<>
			<Head>
				<title>ZTNet - Zerotier Web UI Documentation</title>
				<meta
					name="description"
					content="Official documentation for ZTNet Zerotier Web UI. Learn how to set up, manage, and troubleshoot your ZTNet Web UI."
				/>
				<meta
					name="keywords"
					content="ZTNet, Zerotier Web UI, Zerotier VPN, Documentation, Self-Hosted, Setup, Manage, Troubleshoot"
				/>
				<meta name="author" content="Bernt Christian Egeland" />
			</Head>
			<header>
				<div className="scroll-up-btn">
					<i className="fas fa-angle-up"></i>
				</div>

				<section className="home">
					<div className="info-box">
						<div className="home-content">
							<h2>ZTNET Documentation</h2>

							<h1 className="title-text">
								<span className="text-primary ">Zerotier </span>Controller Web UI
							</h1>
							<div className="nav-buttons">
								<a
									className="bg-primary bg-primary-outline main-button"
									title="Goto github project"
									href="/installation/docker-compose"
								>
									Get Started
								</a>
								<div className="social-group">
									<a
										className="bg-secondary sm-hidden"
										title="Goto github project"
										href="https://github.com/sinamics/ztnet"
										style={{ display: "flex", alignItems: "center" }}
									>
										<svg
											viewBox="0 0 98 96"
											style={{ width: "34px", height: "34px", marginRight: "" }}
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												fillRule="evenodd"
												clipRule="evenodd"
												d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
												fill="#171A1E"
											/>
										</svg>
									</a>
									<a
										className="bg-secondary sm-hidden"
										title="Join our Discord"
										href="YOUR_DISCORD_INVITE_LINK"
										style={{ display: "flex", alignItems: "center" }}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="#000000"
											viewBox="0 0 24 24"
										>
											<path d="M18.942 5.556a16.299 16.299 0 0 0-4.126-1.297c-.178.321-.385.754-.529 1.097a15.175 15.175 0 0 0-4.573 0 11.583 11.583 0 0 0-.535-1.097 16.274 16.274 0 0 0-4.129 1.3c-2.611 3.946-3.319 7.794-2.965 11.587a16.494 16.494 0 0 0 5.061 2.593 12.65 12.65 0 0 0 1.084-1.785 10.689 10.689 0 0 1-1.707-.831c.143-.106.283-.217.418-.331 3.291 1.539 6.866 1.539 10.118 0 .137.114.277.225.418.331-.541.326-1.114.606-1.71.832a12.52 12.52 0 0 0 1.084 1.785 16.46 16.46 0 0 0 5.064-2.595c.415-4.396-.709-8.209-2.973-11.589zM8.678 14.813c-.988 0-1.798-.922-1.798-2.045s.793-2.047 1.798-2.047 1.815.922 1.798 2.047c.001 1.123-.793 2.045-1.798 2.045zm6.644 0c-.988 0-1.798-.922-1.798-2.045s.793-2.047 1.798-2.047 1.815.922 1.798 2.047c0 1.123-.793 2.045-1.798 2.045z" />
										</svg>
									</a>
								</div>
							</div>
						</div>
					</div>
				</section>
			</header>
		</>
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
