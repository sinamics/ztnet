import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const Controller = () => {
  const { data: controllerStats } = api.admin.getControllerStats.useQuery({});
  return (
    <div>
      Controller
      <pre>{JSON.stringify(controllerStats, null, 2)}</pre>
    </div>
  );
};

Controller.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export default Controller;
