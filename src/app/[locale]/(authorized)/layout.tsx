import { ReactNode } from "react";
import Footer from "~/components/layouts/footer";
import Header from "~/components/layouts/header";
// import Header from "~/components/layouts/header";
import Sidebar from "~/components/layouts/sidebar";
// import Modal from "~/components/shared/modal";
// import { useSidebarStore } from "~/utils/store";

type Props = {
	children: ReactNode;
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Props) {
	// const { open } = useSidebarStore();
	return (
		<div className="outer-container">
			{/* <Modal /> */}
			<Header />
			<div className="flex">
				<aside className={`duration-150 ${true ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div className="lg:grid lg:grid-rows-[1fr_auto] inner-container w-full custom-scrollbar">
					<div className={`flex-grow custom-scrollbar ${!true ? "flex-grow" : ""}`}>
						{children}
					</div>
					<Footer />
				</div>
			</div>
		</div>
	);
}
