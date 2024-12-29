import { auth } from "~/server/auth";

const Home = async () => {
	const session = await auth();
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log("esssion", session);
	return (
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
			NextJS
		</div>
	);
};

export default Home;
