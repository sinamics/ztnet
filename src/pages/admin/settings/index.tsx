import { ReactElement } from "react";
import toast from "react-hot-toast";
import EditableField from "~/components/elements/inputField";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { ErrorData, ZodErrorFieldErrors } from "~/types/errorHandling";
import { api } from "~/utils/api";
// import { useTranslations } from "next-intl";

const Settings = () => {
	// const t = useTranslations("admin");

	const {
		data: options,
		isLoading: loadingOptions,
		refetch: refetchOptions,
	} = api.admin.getAllOptions.useQuery();

	const { mutate: setWelcomeMessage } = api.admin.updateGlobalOptions.useMutation({
		onSuccess: () => {
			refetchOptions();
		},
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError
					.fieldErrors as ZodErrorFieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("Unknown Error");
			}
		},
	});

	if (loadingOptions) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}

	return (
		<main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
			<div className="pb-10">
				<p className="text-sm text-gray-400">Public Pages</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="text-sm text-gray-400 py-2">
					<p>
						Customize the text displayed on your login and registration pages to better
						align with your brand or provide specific instructions to your users.
					</p>
				</div>
				<div className="space-y-5">
					<EditableField
						isLoading={false}
						label="Title"
						size="sm"
						placeholder={options?.welcomeMessageTitle || "Hi, Welcome"}
						fields={[
							{
								name: "welcomeMessageTitle",
								description: "Max 50 Char",
								type: "text",
								placeholder: "Write a cool title ....",
								value: options?.welcomeMessageTitle,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								setWelcomeMessage(params);
								resolve(true);
							})
						}
					/>
					<EditableField
						isLoading={false}
						label="Content"
						size="sm"
						placeholder={
							options?.welcomeMessageBody ||
							"ZeroTier VPN is your key to boundless connectivity and ultimate privacy.Experience a secure and borderless digital world, free from limitations. Empower yourself with unmatched performance, while safeguarding your data."
						}
						fields={[
							{
								name: "welcomeMessageBody",
								description: "Max 250 Char",
								placeholder: "Write something ....",
								elementType: "textarea",
								value: options?.welcomeMessageBody,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								setWelcomeMessage(params);
								resolve(true);
							})
						}
					/>
				</div>
			</div>
		</main>
	);
};

Settings.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Settings;
