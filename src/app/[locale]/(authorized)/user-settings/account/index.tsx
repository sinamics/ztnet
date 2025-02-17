import { useCallback, type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import InputField from "~/components/elements/inputField";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { globalSiteVersion } from "~/utils/global";
import Link from "next/link";
import GenerateApiToken from "~/components/userSettings/apiToken";
import { languageNames, supportedLocales } from "~/locales/lang";
import ApplicationFontSize from "~/components/userSettings/fontSize";
import TOTPSetup from "~/components/auth/totpSetup";
import { useModalStore } from "~/utils/store";
import DisableTwoFactSetupModal from "~/components/auth/totpDisable";
import MultifactorNotEnabled from "~/components/auth/multifactorNotEnabledAlert";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";
import ListUserDevices from "~/components/auth/userDevices";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { routing } from "~/i18n/routing";

const defaultLocale = "en";

const Account = () => {
	const router = useRouter();
	const pathname = usePathname();
	const params = useParams();

	const { callModal } = useModalStore((state) => state);
	const t = useTranslations();

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { data: me, refetch: refetchMe, isLoading: meLoading } = api.auth.me.useQuery();

	const { data: session, update: sessionUpdate } = useSession();

	const { mutate: userUpdate, error: userError } = api.auth.update.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [] }),
	});

	const { mutate: updateZtApi } = api.auth.setZtApi.useMutation({
		onError: handleApiError,
	});

	const { mutate: sendVerificationEmail, isPending: sendMailLoading } =
		api.auth.sendVerificationEmail.useMutation({
			onError: handleApiError,
			onSuccess: () => {
				toast.success("Check your email for the verification link");
			},
		});

	const ChangeLanguage = useCallback(
		async (newLocale: string) => {
			if (newLocale === "default") {
				localStorage.removeItem("ztnet-language");

				const browserLocales = navigator.languages.map((lang) => lang.split("-")[0]);
				const isLocaleSupported = browserLocales.some((lang) =>
					supportedLocales.includes(lang as string),
				);
				const matchedLocale =
					browserLocales.find((lang) => supportedLocales.includes(lang as string)) ||
					defaultLocale;

				const locale = isLocaleSupported ? matchedLocale : defaultLocale;

				// In App Router, we handle locale in the pathname
				const newPathname = `/${locale}${pathname}`;
				router.push(newPathname);
				router.refresh(); // If you need to refresh the page data
			} else {
				localStorage.setItem("ztnet-language", newLocale);
				const newPathname = `/${newLocale}${pathname}`;
				router.push(newPathname);
				router.refresh();
			}
		},
		[pathname, router],
	);

	if (userError) {
		toast.error(userError.message);
	}
	return (
		<main className="flex w-full flex-col justify-center space-y-10 p-5 sm:p-3 xl:w-6/12">
			<MenuSectionDividerWrapper
				className="space-y-5"
				title={t("userSettings.account.accountSettings.title").toUpperCase()}
			>
				<InputField
					label={t("userSettings.account.accountSettings.nameLabel")}
					isLoading={!session?.user}
					rootFormClassName="space-y-3 w-6/6 sm:w-3/6"
					size="sm"
					fields={[
						{
							name: "name",
							type: "text",
							placeholder: session?.user?.name,
							value: session?.user?.name,
						},
					]}
					submitHandler={async (params) => await sessionUpdate({ update: { ...params } })}
				/>
				<InputField
					label={t("userSettings.account.accountSettings.emailLabel")}
					isLoading={!session?.user}
					rootFormClassName="space-y-3 w-6/6 sm:w-3/6"
					size="sm"
					toolTip={
						meLoading || sendMailLoading
							? {
									text: "loading",
							  }
							: me?.emailVerified
							  ? {
										text: t("userSettings.account.accountSettings.verifiedBadge"),
										className: "tooltip-success",
										isVerified: true,
								  }
							  : {
										text: "Not verified, click to resend",
										className: "tooltip-primary",
										onClick: sendVerificationEmail,
								  }
					}
					fields={[
						{
							name: "email",
							type: "email",
							placeholder: session?.user?.email,
							value: session?.user?.email,
						},
					]}
					submitHandler={async (params) => {
						await sessionUpdate({ update: { ...params } });
						return refetchMe();
					}}
				/>
				<div className="flex justify-between">
					<div>
						<p className="font-medium">
							{t("userSettings.account.accountSettings.role")}
						</p>
						<p className="text-gray-500">{session?.user?.role}</p>
					</div>
				</div>
			</MenuSectionDividerWrapper>

			<MenuSectionDividerWrapper title="SECURITY" className="space-y-5">
				<InputField
					isLoading={!session?.user}
					label={t("userSettings.account.accountSettings.passwordLabel")}
					placeholder="******"
					size="sm"
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					description="Ensure your account is using a long, random password to stay secure."
					fields={[
						{
							name: "password",
							type: "password",
							placeholder: t(
								"userSettings.account.accountSettings.currentPasswordPlaceholder",
							),
						},
						{
							name: "newPassword",
							type: "password",
							placeholder: t(
								"userSettings.account.accountSettings.newPasswordPlaceholder",
							),
						},
						{
							name: "repeatNewPassword",
							type: "password",
							placeholder: t(
								"userSettings.account.accountSettings.repeatNewPasswordPlaceholder",
							),
						},
					]}
					submitHandler={(params) => {
						return new Promise((resolve, reject) => {
							userUpdate(
								{ ...params },
								{
									onSuccess: () => {
										resolve(true);
									},
									onError: () => {
										reject(false);
									},
								},
							);
						});
					}}
				/>

				{/* TOTP  */}
				<div>{!me?.twoFactorEnabled ? <MultifactorNotEnabled /> : null}</div>

				<div className="flex justify-between">
					<span>
						<p className="text-md font-semibold">
							{t("userSettings.account.totp.title")}
						</p>

						<p className="text-sm text-gray-500">
							{t("userSettings.account.totp.description")}
						</p>
						<p className="text-sm text-gray-500">
							{t("userSettings.account.totp.mfaNote")}
						</p>
					</span>
					<button
						className="btn btn-sm"
						onClick={() =>
							callModal({
								showButtons: false,
								title: t("userSettings.account.totp.totpActivation.title"),
								content: me?.twoFactorEnabled ? (
									<DisableTwoFactSetupModal />
								) : (
									<TOTPSetup />
								),
							})
						}
					>
						{me?.twoFactorEnabled
							? t("commonButtons.disable2fa")
							: t("commonButtons.enable2fa")}
					</button>
				</div>

				{/* user devices  */}
				<ListUserDevices devices={me?.UserDevice} />
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper
				title={t("userSettings.account.restapi.sectionTitle")}
				className="space-y-5"
			>
				<p className="text-sm text-gray-500">
					{t("userSettings.account.restapi.description")}
					<br />
					<Link
						className="link"
						target="_blank"
						href="https://ztnet.network/category/rest-api"
					>
						https://ztnet.network/category/rest-api
					</Link>
				</p>
				<div className="space-y-5">
					<GenerateApiToken />
				</div>
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper
				title={t("userSettings.account.zerotierCentral.title").toUpperCase()}
				className="space-y-5"
			>
				<p className="text-sm text-gray-500">
					{t.rich("userSettings.account.zerotierCentral.description", {
						br: () => <br />,
					})}
				</p>
				<InputField
					label="Zerotier Central API Key"
					placeholder="******"
					size="sm"
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					fields={[
						{
							name: "ztCentralApiKey",
							type: "text",
							placeholder: "api key",
							value: me?.options?.ztCentralApiKey,
						},
					]}
					submitHandler={(params) => {
						return new Promise((resolve, reject) => {
							updateZtApi(
								{ ...params },
								{
									onSuccess: () => {
										void refetchMe();
										resolve(true);
									},
									onError: () => {
										void refetchMe();
										reject(false);
									},
								},
							);
						});
					}}
				/>
				<InputField
					label={t("userSettings.account.zerotierCentral.apiUrlLabel")}
					description={t("userSettings.account.zerotierCentral.apiUrlLabelDescription")}
					size="sm"
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					rootClassName="py-2"
					fields={[
						{
							name: "ztCentralApiUrl",
							type: "text",
							placeholder:
								me?.options?.ztCentralApiUrl || "https://api.zerotier.com/api/v1",
							value: me?.options?.ztCentralApiUrl,
						},
					]}
					submitHandler={(params) => {
						return new Promise((resolve, reject) => {
							updateZtApi(
								{ ...params },
								{
									onSuccess: () => {
										void refetchMe();
										resolve(true);
									},
									onError: () => {
										void refetchMe();
										reject(false);
									},
								},
							);
						});
					}}
				/>
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper
				title={t("userSettings.account.accountPreferences.title")}
				className="space-y-5"
			>
				<div className="form-control w-full max-w-xs">
					<label className="label">
						<span className="label-text font-medium">
							{t("userSettings.account.accountPreferences.languageLabel")}
						</span>
					</label>
					<select
						defaultValue={params?.locale} // use `defaultValue` here
						onChange={(e) => void ChangeLanguage(e.target.value)}
						className="select select-bordered select-sm"
					>
						{routing?.locales.map((language) => (
							<option key={language} value={language}>
								{languageNames[language]}
							</option>
						))}
					</select>
				</div>
				<ApplicationFontSize />
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper
				title={t("userSettings.account.application.title")}
				className="space-y-5"
			>
				<div className="flex items-center justify-between">
					<p>{t("userSettings.account.application.version")}</p>
					<a
						className="link text-primary"
						href="https://github.com/sinamics/ztnet/releases"
					>
						{globalSiteVersion ?? t("userSettings.account.application.developerMode")}
					</a>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

Account.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Account;
