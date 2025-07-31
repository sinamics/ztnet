import { type ReactElement, useState, useEffect, useCallback } from "react";
import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import InputField from "~/components/elements/inputField";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { LayoutPublic } from "~/components/layouts/layout";

const PasswordChangeRequired = () => {
	const router = useRouter();
	const t = useTranslations();
	const [isChanging, setIsChanging] = useState(false);

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { data: session, update: sessionUpdate } = useSession();

	const { mutate: userUpdate } = api.auth.update.useMutation({
		onError: (error) => {
			setIsChanging(false);
			handleApiError(error);
		},
		onSuccess: async (_data, variables) => {
			if (variables && "newPassword" in variables && variables.newPassword) {
				handleApiSuccess({ actions: [] });
				setIsChanging(true);

				// Force session update to refresh requestChangePassword flag
				await sessionUpdate({ update: {} });

				toast.success(t("authPages.passwordChangeRequired.successMessage"));

				// Redirect to dashboard after successful password change
				setTimeout(() => {
					router.push("/");
				}, 1000);
			}
		},
	});

	// Prevent navigation away from this page if password change is still required
	const handleBeforeUnload = useCallback(
		(e: BeforeUnloadEvent) => {
			if (session?.user?.requestChangePassword) {
				e.preventDefault();
				e.returnValue = "";
			}
		},
		[session?.user?.requestChangePassword],
	);

	// Block navigation attempts
	useEffect(() => {
		const handleRouteChange = (url: string) => {
			if (session?.user?.requestChangePassword && url !== router.asPath) {
				router.events.emit("routeChangeError");
				throw "Route change aborted. Password change required.";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		router.events.on("routeChangeStart", handleRouteChange);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			router.events.off("routeChangeStart", handleRouteChange);
		};
	}, [session?.user?.requestChangePassword, router, handleBeforeUnload]);

	if (isChanging) {
		return (
			<div className="card w-full max-w-md bg-base-100 shadow-xl">
				<div className="card-body items-center text-center">
					<div className="loading loading-spinner loading-lg mb-4"></div>
					<h2 className="card-title text-xl">
						{t("authPages.passwordChangeRequired.updatingTitle")}
					</h2>
					<p className="text-base-content/70">
						{t("authPages.passwordChangeRequired.updatingDescription")}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="card w-full max-w-md bg-base-100 shadow-xl">
			<div className="card-body">
				<div className="text-center mb-6">
					<div className="mx-auto w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
						<svg className="w-8 h-8 text-warning" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<h2 className="card-title text-2xl justify-center mb-2">
						{t("authPages.passwordChangeRequired.title")}
					</h2>
					<p className="text-base-content/70">
						{t("authPages.passwordChangeRequired.description")}
					</p>
				</div>

				<div className="space-y-6">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							const password = formData.get("password") as string;
							const newPassword = formData.get("newPassword") as string;
							const repeatNewPassword = formData.get("repeatNewPassword") as string;

							userUpdate({
								password,
								newPassword,
								repeatNewPassword,
							});
						}}
						className="space-y-4"
					>
						<input
							type="password"
							name="password"
							placeholder={t(
								"userSettings.account.accountSettings.currentPasswordPlaceholder",
							)}
							className="input input-bordered input-sm w-full"
							required
						/>
						<input
							type="password"
							name="newPassword"
							placeholder={t(
								"userSettings.account.accountSettings.newPasswordPlaceholder",
							)}
							className="input input-bordered input-sm w-full"
							required
						/>
						<input
							type="password"
							name="repeatNewPassword"
							placeholder={t(
								"userSettings.account.accountSettings.repeatNewPasswordPlaceholder",
							)}
							className="input input-bordered input-sm w-full"
							required
						/>
						<button
							type="submit"
							className="btn btn-primary btn-sm w-full"
							disabled={isChanging}
						>
							{isChanging ? (
								<span className="loading loading-spinner loading-sm"></span>
							) : (
								t("commonButtons.change")
							)}
						</button>
					</form>
				</div>

				<div className="mt-8 text-center">
					<p className="text-sm text-base-content/60">
						{t("authPages.passwordChangeRequired.note")}
					</p>
				</div>
			</div>
		</div>
	);
};

PasswordChangeRequired.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

// Custom getServerSideProps that just loads translations without auth
export const getServerSideProps: GetServerSideProps = async (
	context: GetServerSidePropsContext,
) => {
	return {
		props: {
			messages: (await import(`~/locales/${context.locale}/common.json`)).default,
		},
	};
};

export default PasswordChangeRequired;
