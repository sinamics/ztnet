// import { signIn } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import { toast } from "react-hot-toast";
import { Organization, Role, User } from "@prisma/client";

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
				<h1 className="text-center text-2xl font-semibold text-error">
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
		<div className="z-10 flex justify-center  self-center">
			<div className="w-100 mx-auto rounded-2xl border p-12">
				<div className="mb-4">
					<h3 className="text-2xl font-semibold ">Organization Invitation </h3>
					<p className="text-gray-500">Please sign up with your credentials</p>
				</div>
				<form className="space-y-5" onSubmit={submitHandler}>
					{organizationInvite ? (
						<div className="space-y-2">
							<label className="text-sm font-medium tracking-wide">
								Invitation Token
							</label>
							<input
								className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
								value={formData.ztnetOrganizationToken}
								onChange={handleChange}
								type=""
								name="ztnetToken"
								disabled
								placeholder="Inviation code"
							/>
						</div>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium tracking-wide">Name</label>
						<input
							className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
							value={formData.name}
							onChange={handleChange}
							type=""
							name="name"
							placeholder="First & Last Name"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium tracking-wide">Email</label>
						<input
							className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
							value={formData.email}
							onChange={handleChange}
							type="email"
							name="email"
							placeholder="mail@example.com"
						/>
					</div>
					<div className="space-y-2">
						<label className="mb-5 text-sm font-medium tracking-wide">Password</label>
						<input
							className="w-full content-center rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
							value={formData.password}
							onChange={handleChange}
							type="password"
							name="password"
							placeholder="Enter your password"
						/>
					</div>
					<div className="pt-5">
						<button
							type="submit"
							className={cn(
								"btn btn-block btn-primary cursor-pointer rounded-full p-3 font-semibold tracking-wide shadow-lg",
							)}
						>
							{loading ? <span className="loading loading-spinner"></span> : null}
							Sign Up
						</button>
					</div>
				</form>
				<div className="pt-5 text-center text-xs text-gray-400">
					<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
				</div>
			</div>
		</div>
	);
};

export default RegisterOrganizationInviteForm;
