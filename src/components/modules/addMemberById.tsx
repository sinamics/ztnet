import { useRouter } from "next/router";
import { type ChangeEvent, useState } from "react";
import toast from "react-hot-toast";
import { type ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";

type User = {
  memberid: string;
};
export const AddMemberById = () => {
  const [user, setUser] = useState<User>({ memberid: "" });
  const { query } = useRouter();

  const { refetch: refecthNetworkById } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
    },
    { enabled: !!query.id }
  );

  const { mutate: createUser } = api.networkMember.create.useMutation({
    onSuccess: () => refecthNetworkById(),
    onError: (error) => {
      if ((error.data as ErrorData)?.zodError) {
        const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
        for (const field in fieldErrors) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
          toast.error(`${fieldErrors[field].join(", ")}`);
        }
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred");
      }
    },
  });

  const inputHandler = (event: ChangeEvent<HTMLInputElement>) => {
    setUser({
      ...user,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <div className="form-control">
      <form>
        <label className="label">
          <span className="label-text">
            Manually Add Member. Can be used to undelete a member.
          </span>
        </label>
        <label className="input-group">
          <span className="bg-base-300">Member ID</span>
          <input
            onChange={inputHandler}
            name="memberid"
            value={user.memberid}
            type="text"
            placeholder="10-digit hex number"
            className="input input-bordered"
          />
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              createUser(
                {
                  id: user.memberid,
                  nwid: query.id as string,
                },
                { onSuccess: () => setUser({ memberid: "" }) }
              );
            }}
            className="btn btn-square"
          >
            Add
          </button>
        </label>
      </form>
    </div>
  );
};
