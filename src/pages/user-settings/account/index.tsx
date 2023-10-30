import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import InputField from "~/components/elements/inputField";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { globalSiteVersion } from "~/utils/global";
import Link from "next/link";
import ApiToken from "~/components/userSettings/apiToken";

const languageNames = {
	en: "English",
	no: "Norwegian",
	zh: "Chinese",
	es: "Spanish",
};

const Account = () => {
	const { asPath, locale, locales, push } = useRouter();
	const t = useTranslations("userSettings");
	const { data: me, refetch: refetchMe } = api.auth.me.useQuery();

	const { data: session, update: sessionUpdate } = useSession();
	const { mutate: userUpdate, error: userError } = api.auth.update.useMutation();

	const { mutate: updateZtApi } = api.auth.setZtApi.useMutation({
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const ChangeLanguage = async (locale: string) => {
		await push(asPath, asPath, { locale });
		localStorage.setItem("ztnet-language", locale);
	};
	if (userError) {
		toast.error(userError.message);
	}

	return (
		<main className="mx-auto flex w-full flex-col justify-center space-y-10 bg-base-100 p-3 sm:w-6/12">
			<div>
				<p className="text-[0.7rem] text-gray-400">
					{t("account.accountSettings.title").toUpperCase()}
				</p>
				<div className="divider mt-0 p-0 text-gray-500" />
				<div className="space-y-5">
					<InputField
						label={t("account.accountSettings.nameLabel")}
						isLoading={!session?.user}
						rootClassName=""
						size="sm"
						fields={[
							{
								name: "name",
								type: "text",
								placeholder: session?.user?.name,
								value: session?.user?.name,
							},
						]}
						submitHandler={async (params) =>
							await sessionUpdate({ update: { ...params } })
						}
					/>

					<InputField
						label={t("account.accountSettings.emailLabel")}
						isLoading={!session?.user}
						rootClassName=""
						size="sm"
						// badge={
						// 	session?.user?.emailVerified
						// 		? {
						// 				text: t("account.accountSettings.verifiedBadge"),
						// 				color: "success",
						// 		  }
						// 		: {
						// 				text: t("account.accountSettings.notVerifiedBadge"),
						// 				color: "warning",
						// 		  }
						// }
						fields={[
							{
								name: "email",
								type: "text",
								placeholder: session?.user?.email,
								value: session?.user?.email,
							},
						]}
						submitHandler={async (params) =>
							await sessionUpdate({ update: { ...params } })
						}
					/>

					<InputField
						isLoading={!session?.user}
						label={t("account.accountSettings.passwordLabel")}
						placeholder="******"
						size="sm"
						rootFormClassName="space-y-3 pt-2"
						fields={[
							{
								name: "password",
								type: "password",
								placeholder: t("account.accountSettings.currentPasswordPlaceholder"),
							},
							{
								name: "newPassword",
								type: "password",
								placeholder: t("account.accountSettings.newPasswordPlaceholder"),
							},
							{
								name: "repeatNewPassword",
								type: "password",
								placeholder: t("account.accountSettings.repeatNewPasswordPlaceholder"),
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

					<div className="flex justify-between">
						<div>
							<p className="font-medium">{t("account.accountSettings.role")}</p>
							<p className="text-gray-500">{session?.user?.role}</p>
						</div>
					</div>
				</div>
			</div>

			<div>
				<div className="text-gray-400 uppercase text-[0.7rem]">
					{t("account.restapi.sectionTitle")}
				</div>
				<div className="divider m-0 p-0 text-gray-500" />
				<div>
					<p className="text-sm text-gray-500">
						{t("account.restapi.description")}
						<br />
						<Link
							className="link"
							target="_blank"
							href="https://ztnet.network/Rest%20Api/ztnet-web-api"
						>
							https://ztnet.network/Rest%20Api/ztnet-web-api
						</Link>
					</p>
				</div>
				<div className="space-y-5">
					<ApiToken />
				</div>
			</div>

			<div>
				<div className="pt-10 text-[0.7rem] text-gray-400">
					{t("account.zerotierCentral.title").toUpperCase()}
					<div className="badge badge-primary p-1 text-[0.6rem]">BETA</div>
				</div>
				<div className="divider m-0 p-0 text-gray-500" />
				<div>
					<p className="text-sm text-gray-500">
						{t.rich("account.zerotierCentral.description", {
							br: () => <br />,
						})}
					</p>
					<div className="pt-3">
						<InputField
							label="Zerotier Central API Key"
							placeholder="******"
							size="sm"
							rootFormClassName="space-y-3 pt-2"
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
					</div>
				</div>
				<div className="form-control w-full">
					<div className="pt-3">
						<InputField
							label={t("account.zerotierCentral.apiUrlLabel")}
							description={t("account.zerotierCentral.apiUrlLabelDescription")}
							size="sm"
							rootFormClassName="space-y-3 pt-2"
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
					</div>
				</div>
			</div>
			<div>
				<p className="pt-10 text-[0.7rem] text-gray-400 uppercase">
					{t("account.accountPreferences.title")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500" />
				<div className="form-control w-full max-w-xs">
					<label className="label">
						<span className="label-text font-medium">
							{t("account.accountPreferences.languageLabel")}
						</span>
					</label>
					<select
						defaultValue={locale} // use `defaultValue` here
						onChange={(e) => void ChangeLanguage(e.target.value)}
						className="select select-bordered select-sm"
					>
						{locales.map((language) => (
							<option key={language} value={language}>
								{languageNames[language]}
							</option>
						))}
					</select>
				</div>
			</div>

			<div>
				<div className="py-10">
					<p className="text-gray-400 text-[0.7rem] uppercase">
						{t("account.application.title")}
					</p>
					<div className="divider mt-0 p-0 text-gray-500"></div>
					<div className="flex items-center justify-between">
						<p>{t("account.application.version")}</p>
						<a
							className="link text-primary"
							href="https://github.com/sinamics/ztnet/releases"
						>
							{globalSiteVersion ?? t("account.application.developerMode")}
						</a>
					</div>
				</div>
			</div>
		</main>
	);
};

Account.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Account;
