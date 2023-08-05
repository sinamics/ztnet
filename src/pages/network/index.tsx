import Head from "next/head";
import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { NetworkTable } from "../../components/modules/networkTable";
import { globalSiteTitle } from "~/utils/global";
import { useTranslations } from "next-intl";
import { type GetServerSidePropsContext } from "next";

const Networks: NextPageWithLayout = () => {
  const t = useTranslations("networks");
  const {
    data: userNetworks,
    isLoading,
    refetch,
  } = api.network.getUserNetworks.useQuery({
    central: false,
  });
  const { mutate: createNetwork } = api.network.createNetwork.useMutation();

  const addNewNetwork = () => {
    createNetwork({ central: false }, { onSuccess: () => void refetch() });
  };

  if (isLoading) {
    // add loading progress bar to center of page, vertially and horizontally
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          <progress className="progress progress-primary w-56"></progress>
        </h1>
      </div>
    );
  }

  const title = `${globalSiteTitle} - ${t("title")}`;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={t("description")} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-full bg-base-100">
        <div className="mb-3 mt-3 flex w-full justify-center ">
          <h5 className="w-full text-center text-2xl">{t("title")}</h5>
        </div>
        <div className="grid grid-cols-1 space-y-3 px-3 pt-5 md:grid-cols-[1fr,1fr,1fr] md:space-y-0 md:px-11">
          <div className="flex justify-center">
            <button
              className={`btn btn-primary btn-outline`}
              onClick={addNewNetwork}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="mr-2 h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              {t("addNetworkButton")}
            </button>
          </div>
          <div className="col-span-2">
            {userNetworks && userNetworks.length > 0 && (
              <NetworkTable tableData={userNetworks} />
            )}
            {!userNetworks ||
              (userNetworks.length === 0 && (
                <div className="alert alert-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 shrink-0 stroke-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>{t("noNetworksMessage")}</span>
                </div>
              ))}
          </div>
        </div>
      </main>
    </>
  );
};

Networks.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      // You can get the messages from anywhere you like. The recommended
      // pattern is to put them in JSON files separated by locale and read
      // the desired one based on the `locale` received from Next.js.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      messages: (await import(`../../locales/${context.locale}/common.json`))
        .default,
    },
  };
}
export default Networks;
