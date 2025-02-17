import { redirect } from "next/navigation";
import { ReactNode } from "react";
import MainLayout from "~/components/layouts/authenticatedLayout";
import { auth } from "~/server/auth";

type Props = {
	children: ReactNode;
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default async function RootLayout({ children }: Props) {
	const session = await auth();

	// if not authenticated, redirect to login
	if (!session) {
		// redirect to login
		redirect("/auth/login");
	}

	return <MainLayout>{children}</MainLayout>;
}
