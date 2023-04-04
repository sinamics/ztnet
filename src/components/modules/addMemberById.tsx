import { useRouter } from "next/router";
import { type ChangeEvent, useState } from "react";
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

  const { mutate: updateUserDb } =
    api.networkMember.UpdateDatabaseOnly.useMutation({
      onSuccess: () => refecthNetworkById(),
    });

  const inputHandler = (event: ChangeEvent<HTMLInputElement>) => {
    setUser({
      ...user,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <div>
      {/* <input
        // action={{
        //   color: 'teal',
        //   labelPosition: 'left',
        //   icon: 'add',
        //   content: 'Add member manually',
        //   onClick: () => addMember(network.nwid),
        // }}
        value={handler.memberId}
        onChange={handleChange}
        actionPosition="left"
        placeholder="Device ID"
        name="memberId"
      /> */}

      <div className="form-control">
        <label className="label">
          <span className="label-text">
            Adds a node to this network before it joins. Can be used to undelete
            a member.
          </span>
        </label>
        <label className="input-group">
          <span>Member ID</span>
          <input
            onChange={inputHandler}
            name="memberid"
            value={user.memberid}
            type="text"
            placeholder="10-digit hex number"
            className="input-bordered input"
          />
          <button
            onClick={() =>
              updateUserDb(
                {
                  id: user.memberid,
                  nwid: query.id as string,
                  updateParams: { deleted: false },
                },
                { onSuccess: () => setUser({ memberid: "" }) }
              )
            }
            className="btn-square btn"
          >
            Add
          </button>
        </label>
      </div>
      {/* <div>
        <Label pointing>
          Adds a node to this network before it joins.
          <br /> Can be used to undelete a member.
        </Label>
      </div> */}
    </div>
  );
};
