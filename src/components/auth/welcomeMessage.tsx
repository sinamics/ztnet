import { api } from "~/utils/api";
import ZtnetLogo from "docs/images/logo/ztnet_200x178.png";
import Link from "next/link";

export const WelcomeMessage = () => {
	const { data: options, isLoading } = api.public.getWelcomeMessage.useQuery();

	return (
		<div className="z-10 sm:max-w-2xl md:p-10 xl:max-w-4xl">
			<div className="hidden flex-col self-start lg:flex">
				{!isLoading && (
					<div className="fade-in">
						<div className="md:mb-10">
							{options?.welcomeMessageTitle ? (
								<h1 className="text-4xl font-medium">{options.welcomeMessageTitle}</h1>
							) : (
								<div>
									<h1 className="mb-2 text-5xl font-bold">
										<div className="flex items-center space-x-5">
											<img
												style={{ width: 50, height: 50 }}
												alt="ztnet logo"
												title="ztnet logo"
												src={ZtnetLogo.src}
											/>
											<span className="zt-color">ZTNET</span>
										</div>
									</h1>
									<Link
										href="https://ztnet.network/"
										rel="noopener noreferrer"
										className="text-sm text-primary/50"
										target="_blank"
									>
										https://ztnet.network
									</Link>
								</div>
							)}
						</div>
						<p className="pr-3">
							{options?.welcomeMessageBody || (
								<span>
									ZeroTier VPN is your key to boundless connectivity and ultimate privacy.
									Experience a secure and borderless digital world, free from limitations.
									Empower yourself with unmatched performance, while safeguarding your
									data.
								</span>
							)}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
