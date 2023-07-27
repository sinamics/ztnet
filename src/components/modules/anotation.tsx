import { useState } from "react";
import Input from "~/components/elements/input";
import { api } from "~/utils/api";

type IAnotationProps = {
  name: string;
};
type IProps = {
  nwid: string;
  nodeid: number;
};

const Anotation = ({ nwid, nodeid }: IProps) => {
  const [input, setInput] = useState<IAnotationProps>();

  const { data: anotationArray } = api.network.getAnotation.useQuery({
    nwid,
  });
  const { mutate: removeAnotation } =
    api.networkMember.removeMemberAnotations.useMutation();

  const { data: memberAnotationArray, refetch: refetchMemberAnotation } =
    api.networkMember.getMemberAnotations.useQuery({
      nwid,
      nodeid,
    });

  const { mutate: setAnotation } = api.network.addAnotation.useMutation();

  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  // Filtering the notations based on the input text
  const filteredAnotations = anotationArray?.filter((anotation) =>
    anotation.name.toLowerCase().includes(input?.name.toLowerCase())
  );
  const handleBlur = () => {
    // if (input?.name) {
    //   setAnotation(
    //     {
    //       name: input.name,
    //       nwid,
    //       nodeid,
    //     },
    //     {
    //       onSuccess: () => {
    //         void refetchMemberAnotation();
    //         setInput({ name: "" });
    //       },
    //     }
    //   );
    // }
  };
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p>Notation</p>
          <p className="text-sm text-gray-500">
            Enhance your member organization by adding notations
          </p>
        </div>
        <form>
          <Input
            type="text"
            className="input-bordered input-sm"
            name="name"
            placeholder="Add Notation"
            value={input?.name}
            onChange={inputHandler}
            onBlur={handleBlur}
            list="anotation-list"
          />
          <datalist id="anotation-list">
            {filteredAnotations?.map((anotation, idx) => (
              <option key={idx} value={anotation.name} />
            ))}
          </datalist>
          <button
            onClick={(e) => {
              e.preventDefault();
              setAnotation(
                {
                  name: input?.name,
                  nwid,
                  nodeid,
                },
                {
                  onSuccess: () => {
                    void refetchMemberAnotation();
                    setInput({ name: "" });
                  },
                }
              );
            }}
            type="submit"
            className="hidden"
          />
        </form>
      </div>
      <div className="flex gap-2">
        {memberAnotationArray?.map((anotation, idx) => (
          <div key={idx} className="badge badge-primary badge-lg rounded-md">
            <p>{anotation?.label?.name}</p>
            <div title="delete ip assignment">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
                onClick={() =>
                  removeAnotation(
                    {
                      nodeid,
                      notationId: anotation?.notationId,
                    },
                    {
                      onSuccess: () => {
                        void refetchMemberAnotation();
                      },
                    }
                  )
                }
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Anotation;
