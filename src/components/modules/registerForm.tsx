// import { signIn } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import { toast } from "react-hot-toast";
interface FormData {
  email: string;
  password: string;
  name: string;
}

const RegisterForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
  });

  const { mutate: register } = api.auth.register.useMutation();
  const router = useRouter();

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
      onSuccess: () =>
        void (async () => {
          const result = await signIn("credentials", {
            redirect: false,
            ...formData,
          });
          setLoading(false);

          if (!result.error) {
            await router.push("/dashboard");
          }
        })(),
      onError: (error) => {
        setLoading(false);
        toast.error(error.message, { duration: 10000 });
      },
    });
  };
  return (
    <div className="z-10 flex justify-center  self-center">
      <div className="w-100 mx-auto rounded-2xl bg-white p-12 ">
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-gray-800">Register </h3>
          <p className="text-gray-500">Please sign up with your credentials</p>
        </div>
        <form className="space-y-5" onSubmit={submitHandler}>
          <div className="space-y-2">
            <label className="text-sm font-medium tracking-wide text-gray-700">
              Name
            </label>
            <input
              className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-green-400 focus:outline-none"
              value={formData.name}
              onChange={handleChange}
              type=""
              name="name"
              placeholder="First & Last Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium tracking-wide text-gray-700">
              Email
            </label>
            <input
              className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-green-400 focus:outline-none"
              value={formData.email}
              onChange={handleChange}
              type="email"
              name="email"
              placeholder="mail@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="mb-5 text-sm font-medium tracking-wide text-gray-700">
              Password
            </label>
            <input
              className="w-full content-center rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-green-400 focus:outline-none"
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
                "btn-block btn cursor-pointer rounded-full p-3 font-semibold tracking-wide text-gray-100  shadow-lg",
                { loading: loading }
              )}
            >
              Sign Up
            </button>
          </div>
        </form>
        <div className="pt-5 text-center text-xs text-gray-400">
          <span>
            Copyright © 2021-2022
            <a
              href="https://uavmatrix.com"
              rel=""
              target="_blank"
              title="Bernt Christian Egeland"
              className="text-green hover:text-slate-900 "
            >
              @UAVMATRIX
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
