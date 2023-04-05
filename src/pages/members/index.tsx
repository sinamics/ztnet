import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { MembersTable } from "~/components/modules/membersTable";

const Members = () => {
  return (
    <div className="p-10">
      <MembersTable />
    </div>
  );
};
Members.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Members;
