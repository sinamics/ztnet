import { useState, type ReactElement } from "react";
import Input from "~/components/elements/input";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

type IAnotationProps = {
  name: string;
};

const NetworkSetting = () => {
  const [input, setInput] = useState<IAnotationProps>();
  const { data: anotationArray, isLoading: loadingOptions } =
    api.network.getAnotation.useQuery();

  const { mutate: setAnotation } = api.network.addAnotation.useMutation();

  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  // if (loadingOptions) {
  //   return (
  //     <div className="flex flex-col items-center justify-center">
  //       <h1 className="text-center text-2xl font-semibold">
  //         <progress className="progress progress-primary w-56"></progress>
  //       </h1>
  //     </div>
  //   );
  // }

  return (
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div className="pb-10">
        <p className="text-sm text-gray-400">Member Notations</p>
        {anotationArray?.map((anotation, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <p>{anotation?.name}</p>
            <button
              // onClick={() => setAnotation(anotation)}
              className="btn btn-primary btn-sm"
            >
              Remove
            </button>
          </div>
        ))}
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="flex items-center justify-between">
          <p>Add notation tag</p>
          <form>
            <Input
              type="text"
              className="input-bordered input-sm"
              name="name"
              placeholder="Add Tag"
              value={input?.name}
              onChange={inputHandler}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
              }}
              type="submit"
              className="hidden"
            />
          </form>
        </div>
      </div>
    </main>
  );
};
NetworkSetting.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default NetworkSetting;
