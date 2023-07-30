import { useState } from "react";
import Input from "~/components/elements/input";
import { api } from "~/utils/api";
import { getRandomColor } from "~/utils/randomColor";
import { useTranslations } from "next-intl";

type IAnotationProps = {
  name: string;
};
type IProps = {
  nwid: string;
  nodeid: number;
};
const initalState: IAnotationProps = {
  name: "",
};

const Anotation = ({ nwid, nodeid }: IProps) => {
  const t = useTranslations("networkById");
  const [input, setInput] = useState<IAnotationProps>(initalState);
  const { refetch: refetchNetworkById } = api.network.getNetworkById.useQuery(
    {
      nwid,
    },
    { enabled: !!nwid, networkMode: "online" }
  );
  const { data: anotationArray, refetch: refetchAnotation } =
    api.network.getAnotation.useQuery(
      {
        nwid,
      },
      {
        enabled: !!nwid,
      }
    );
  const { mutate: removeAnotation } =
    api.networkMember.removeMemberAnotations.useMutation();

  const { data: memberAnotationArray, refetch: refetchMemberAnotation } =
    api.networkMember.getMemberAnotations.useQuery(
      {
        nwid,
        nodeid,
      },
      {
        enabled: !!nodeid && !!nwid,
      }
    );

  const { mutate: setAnotation } = api.network.addAnotation.useMutation();

  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Check if the value is in the datalist
    const isInList = filteredAnotations.some(
      (anotation) => anotation.name === value
    );
    if (isInList) {
      setAnotation(
        {
          name: value,
          color: getRandomColor(),
          nwid,
          nodeid,
        },
        {
          onSuccess: () => {
            void refetchMemberAnotation();
            void refetchAnotation();
            void refetchNetworkById();
            setInput({ name: "" });
          },
        }
      );
    } else {
      setInput((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Filtering the notations based on the input text
  const filteredAnotations = anotationArray?.filter((anotation) =>
    anotation.name.toLowerCase().includes(input?.name.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p>{t("memberOptionModal.anotation.header")}</p>
          <p className="text-sm text-gray-500">
            {t("memberOptionModal.anotation.description")}
          </p>
        </div>
        <form>
          <Input
            type="text"
            className="input-bordered input-sm"
            name="name"
            placeholder={t("memberOptionModal.anotation.placeholder")}
            value={input?.name || ""}
            onChange={inputHandler}
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
                  color: getRandomColor(),
                  nwid,
                  nodeid,
                },
                {
                  onSuccess: () => {
                    void refetchMemberAnotation();
                    void refetchAnotation();
                    void refetchNetworkById();
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
          <div
            key={idx}
            className={`badge badge-lg rounded-md`}
            style={{ backgroundColor: `${anotation.label.color}` }}
          >
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
                        void refetchAnotation();
                        void refetchNetworkById();
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
