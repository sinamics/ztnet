import Head from "next/head";
import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import type { NextPageWithLayout } from "../_app";
import { globalSiteTitle } from "~/utils/global";

const Dashboard: NextPageWithLayout = () => {
  const title = `${globalSiteTitle} - Dashboard`;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="UAV vpn dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="my-10">
        <div className="mx-auto max-w-6xl space-y-10 bg-cover bg-center bg-no-repeat">
          {/* <div className="absolute inset-0 z-0">test </div> */}
          <div className="col-start-2 mx-0 flex justify-center text-5xl">
            Welcome to {globalSiteTitle}
          </div>
          {/* grid with cards  */}
          <div className="grid grid-flow-col gap-3">
            <div className="card w-96 bg-primary shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Members</h2>
                <p>
                  Connect team members from anywhere in the world on any device.
                  ZeroTier creates secure networks between on-premise, cloud,
                  desktop, and mobile devices.
                </p>
              </div>
            </div>
            <div className="card w-96 bg-primary shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Everywhere</h2>
                <p>
                  Connect Everywhere, Securely: ZeroTier, Your Global Network
                  Solution
                </p>
              </div>
            </div>
            <div className="card w-96 bg-primary shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Infinite Possibilities</h2>
                <p>Empowering Seamless Connections, Anywhere and Everywhere</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

Dashboard.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Dashboard;

// export const getServerSideProps = (context) =>
//   ProtectedPageRoute(context, null, async () => {
//     // fetch props
//     return {
//       props: {},
//     };
//   });
