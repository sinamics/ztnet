import { signIn } from "next-auth/react";
import router from "next/router";
import { type Dispatch, type SetStateAction, useState } from "react";
import cn from "classnames";
import { toast } from "react-hot-toast";

interface IProps {
  setViewForgotForm: Dispatch<SetStateAction<boolean>>;
}
interface FormData {
  email: string;
  password: string;
}

type NextAuthError = {
  message: string;
  code?: string;
  statusCode?: number;
};

const LoginForm: React.FC<IProps> = ({ setViewForgotForm }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

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

    signIn("credentials", {
      redirect: false,
      ...formData,
    })
      .then(async (result) => {
        if (!result.error) {
          return await router.push("/dashboard");
        }
        toast.error(result.error, { duration: 10000 });
        setLoading(false);
      })
      .catch((error: NextAuthError) => {
        // Handle any errors that might occur during the signIn process
        toast.error(error.message);
        setLoading(false);
      });
  };

  return (
    <div className="z-10 flex justify-center  self-center">
      <div className="w-100 mx-auto rounded-2xl bg-white p-12 ">
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
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a
                onClick={() => void setViewForgotForm((prev: boolean) => !prev)}
                className="cursor-pointer text-gray-400 hover:text-base-200"
              >
                Forgot your password?
              </a>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className={cn(
                "btn btn-block cursor-pointer rounded-full p-3 font-semibold tracking-wide text-gray-100  shadow-lg"
              )}
            >
              {loading ? (
                <span className="loading loading-spinner"></span>
              ) : null}
              Sign in
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

export default LoginForm;
