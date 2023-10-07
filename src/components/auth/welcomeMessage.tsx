import { api } from "~/utils/api";

export const WelcomeMessage = () => {
	const { data: options } = api.public.getWelcomeMessage.useQuery();

	return (
		<div className="z-10 sm:max-w-2xl md:p-10 xl:max-w-2xl">
			<div className="hidden flex-col self-start text-white lg:flex">
				<div className="md:mb-10">
					<h1 className="mb-3  text-5xl font-bold">
						{options?.welcomeMessageTitle || <span>Hi, Welcome</span>}
					</h1>
				</div>
				<p className="pr-3">
					{options?.welcomeMessageBody || (
						<span>
							ZeroTier VPN is your key to boundless connectivity and ultimate privacy.
							Experience a secure and borderless digital world, free from limitations.
							Empower yourself with unmatched performance, while safeguarding your data.
						</span>
					)}
				</p>
			</div>
		</div>
	);
};
