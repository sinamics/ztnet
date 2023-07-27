import { useState } from "react";
import Input from "~/components/elements/input";
import { api } from "~/utils/api";

type IAnotationProps = {
  name: string;
};
type IProps = {
  nwid: string;
};
const Anotation = ({ nwid }: IProps) => {
  const [input, setInput] = useState<IAnotationProps>();

  const { data: anotationArray } = api.network.getAnotation.useQuery({
    nwid,
  });

  const { mutate: setAnotation } = api.network.addAnotation.useMutation();

  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p>Notation</p>
          <p className="text-sm text-gray-500">
            Adding notation to member would make it easier to group members
          </p>
        </div>
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
              setAnotation({
                name: input?.name,
                nwid,
              });
            }}
            type="submit"
            className="hidden"
          />
        </form>
      </div>
      <div className="flex gap-2">
        {anotationArray?.map((anotation, idx) => (
          <div key={idx} className="badge badge-primary badge-lg rounded-md">
            <p>{anotation?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Anotation;
