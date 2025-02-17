import { ReactNode } from "react";
import { WelcomeMessage } from "~/components/auth/welcomeMessage";

type Props = {
	children: ReactNode;
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function PublicLayout({ children }: Props) {
	return (
		<div className="outer-container">
			<main className="min-h-[100dvh] container mx-auto flex items-center justify-center">
				{/* Main section */}
				<div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 w-full max-w-7xl m-5 sm:m-0">
					<div className="h-full flex items-start">
						<WelcomeMessage />
					</div>
					<div>{children}</div>
				</div>
			</main>
		</div>
	);
}
