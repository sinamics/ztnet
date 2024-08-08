import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { Organization, Role, User } from "@prisma/client";
import FormSubmitButtons from "./formSubmitButton";
import FormInput from "./formInput";

interface FormData {
	email: string;
	password: string;
	name: string;
	ztnetOrganizationToken?: string;
	token: string;
}

interface IUser extends User {
	user: {
		email: string;
		name: string;
		id: string;
		expiresAt: Date;
		role: Role;
		memberOfOrgs: Organization[];
	};
}

interface Iprops {
	organizationInvite?: string;
}

const RegisterOrganizationInviteForm: React.FC<Iprops> = ({
	organizationInvite,
}: Iprops) => {
	const router = useRouter();

	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<FormData>({
		email: "",
		password: "",
		name: "",
		token: "",
		ztnetOrganizationToken: organizationInvite,
	});

	const { mutate: register } = api.auth.register.useMutation();

	// Prevalidate the user invite
	// check if the user is a member of the application then add him to the organization
	const {
		error: preValidateError,
		isLoading: preValidateLoading,
		status,
	} = api.org.preValidateUserInvite.useQuery(
		{
			token: organizationInvite,
		},
		{
			retry: false,
			onSuccess: (data) => {
				if ("organizationId" in data) {
					// redirect to login / organization page
					router.push(`/organization/${data.organizationId}`);
				}
			},
		},
	);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;

		setFormData((prevFormData) => ({
			...prevFormData,
			[name]: value,
		}));
	};

	const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
		setLoading(true);
		event.preventDefault();
		register(formData, {
			onSuccess: ({ user }: IUser) => {
				// get the first org id
				const orgId = user?.memberOfOrgs?.[0]?.id;
				void (async () => {
					const result = await signIn("credentials", {
						redirect: false,
						...formData,
					});
					setLoading(false);
					if (!result.error) {
						// if the user is a member of an organization, redirect to the organization
						if (orgId) return await router.push(`/organization/${orgId}`);

						// otherwise redirect to the network
						await router.push("/network");
					}
				})();
			},
			onError: (error) => {
				setLoading(false);
				toast.error(error.message, { duration: 10000 });
			},
		});
	};

	// add loading progress bar to center of page, vertially and horizontally
	if (status === "loading" || preValidateLoading) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}
	// if error show user
	if (preValidateError) {
		return (
			<div className="flex flex-col items-center justify-center space-y-5">
				<h1 className="text-center text-1xl font-semibold text-error">
					{preValidateError.message}
				</h1>
				<button
					onClick={() => router.push("/auth/login")}
					className="btn btn-primary btn-sm"
				>
					GOTO LOGIN
				</button>
			</div>
		);
	}
	return (
		<form className="space-y-5" onSubmit={submitHandler}>
			{organizationInvite ? (
				<FormInput
					label="Inviation Token"
					name="ztnetToken"
					type="text"
					disabled
					value={formData.ztnetOrganizationToken}
					onChange={handleChange}
					placeholder="token"
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="size-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
							/>
						</svg>
					}
				/>
			) : null}
			<FormInput
				label="Name"
				name="name"
				type="text"
				value={formData.name}
				onChange={handleChange}
				placeholder="First & Last Name"
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-4 w-4 opacity-70"
					>
						<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
					</svg>
				}
			/>
			<FormInput
				label="Email"
				name="email"
				type="email"
				value={formData.email}
				onChange={handleChange}
				placeholder="mail@example.com"
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-4 w-4 opacity-70"
					>
						<path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
						<path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
					</svg>
				}
			/>
			<FormInput
				label="Password"
				name="password"
				type="password"
				value={formData.password}
				onChange={handleChange}
				placeholder="Enter your password"
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-4 w-4 opacity-70"
					>
						<path
							fillRule="evenodd"
							d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
							clipRule="evenodd"
						/>
					</svg>
				}
			/>
			<div className="pt-5">
				<FormSubmitButtons loading={loading} title="Sign Up" />
			</div>
		</form>
	);
};

export default RegisterOrganizationInviteForm;
