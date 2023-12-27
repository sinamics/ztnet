import Head from "next/head";
import React from "react";

const MetaTags = ({ title }: { title: string }) => {
	return (
		<Head>
			<title>{title}</title>
			<link rel="icon" href="/favicon.ico" />
			<meta property="og:title" content={title} key={title} />
			<meta name="robots" content="noindex, nofollow" />
		</Head>
	);
};

export default MetaTags;
