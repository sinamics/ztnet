import Head from "next/head";
import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layout";
import type { NextPageWithLayout } from "../_app";

// import { api } from "~/utils/api";

const Dashboard: NextPageWithLayout = () => {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });
  //   const network = api.networkRouter.message.useQuery();

  return (
    <>
      <Head>
        <title>{process.env.NEXT_PUBLIC_SITE_NAME} - Dashboard</title>
        <meta name="description" content="UAV vpn dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <div className="mx-auto max-w-6xl space-y-5 bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          {/* <div className="absolute inset-0 z-0">test </div> */}
          <div className="col-start-2 mx-0 flex justify-center text-5xl">
            Welcome to {process.env.NEXT_PUBLIC_SITE_NAME}
          </div>
          <div className="col-start-2">
            <p className="justify-center text-xl sm:flex sm:flex-row">
              Connect team members from anywhere in the world on any device.
              ZeroTier creates secure networks between on-premise, cloud,
              desktop, and mobile devices.
            </p>
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
