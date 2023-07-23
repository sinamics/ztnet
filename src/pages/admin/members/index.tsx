import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { Accounts } from "~/components/modules/accountTable";

const Users = () => {
  return (
    <div className="p-10">
      <Accounts />
    </div>
  );
};
Users.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Users;
