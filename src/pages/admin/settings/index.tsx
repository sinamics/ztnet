import EditableField from "~/components/elements/inputField";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
// import { useTranslations } from "next-intl";

// !PAGE IS NOT IN USE!
const Settings = () => {
	// const t = useTranslations("admin");
	const { mutate: setRegistration } = api.admin.updateGlobalOptions.useMutation();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

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
				<p className="text-sm text-gray-400">Landing Page</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="space-y-5">
					<EditableField
						isLoading={false}
						label="Title"
						// buttonClassName="hidden"
						size="sm"
						fields={[
							{
								name: "title",
								type: "text",

								placeholder: "Hi, Welcome",
								value: options?.smtpHost,
							},
						]}
						submitHandler={(params) => console.log(params)}
					/>
					<EditableField
						isLoading={false}
						label="Content"
						size="sm"
						fields={[
							{
								name: "body",
								elementType: "textarea",
								placeholder:
									"ZeroTier VPN is your key to boundless connectivity and ultimate privacy.\
										Experience a secure and borderless digital world, free from limitations. Empower yourself with unmatched performance, \
										while safeguarding your data.",
								value:
									"ZeroTier VPN is your key to boundless connectivity and ultimate privacy.\
								Experience a secure and borderless digital world, free from limitations. Empower yourself with unmatched performance, \
								while safeguarding your data.",
							},
						]}
						submitHandler={(params) => console.log(params)}
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
