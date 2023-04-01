/* eslint-disable @typescript-eslint/no-misused-promises */
import { signIn } from "next-auth/react";
import router from "next/router";
import { useState } from "react";

interface FormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const submitHandler = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    // login(formData);
    const result = await signIn("credentials", {
      redirect: false,
      ...formData,
    });

    if (!result.error) {
      await router.push("/dashboard");
    }
    setLoginError(result.error);
  };
  return (
    <div className="z-10 flex justify-center  self-center">
      <div className="w-100 mx-auto rounded-2xl bg-white p-12 ">
        <span className="flex justify-center text-red-600">
          {loginError ? loginError : null}
        </span>
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-gray-800">Sign In </h3>
          <p className="text-gray-500">Please sign in to your account.</p>
        </div>
        <form className="space-y-5" onSubmit={submitHandler}>
          <div className="space-y-2">
            <label className="text-sm font-medium tracking-wide text-gray-700">
              Email
            </label>
            <input
              className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-green-400 focus:outline-none"
              value={formData.email}
              onChange={handleChange}
              type=""
              name="email"
              placeholder="mail@gmail.com"
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
              type=""
              name="password"
              placeholder="Enter your password"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 bg-blue-500 focus:ring-blue-400"
              />
              <label
                //   for='remember_me'
                className="ml-2 block text-sm text-gray-800"
              >
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="text-gray-400 hover:text-green-500">
                Forgot your password?
              </a>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="flex w-full cursor-pointer justify-center  rounded-full bg-gray-600 p-3  font-semibold tracking-wide text-gray-100  shadow-lg transition duration-500 ease-in hover:bg-slate-500"
            >
              Sign in
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

export default LoginForm;
