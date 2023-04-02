import type { ReactNode } from "react";
import Header from "../modules/header";
import Sidebar from "../modules/sidebar";

interface Props {
  children: ReactNode;
}

export const LayoutPublic = ({ children }: Props): JSX.Element => {
  return <>{children}</>;
};

export const LayoutAuthenticated = ({ children }: Props): JSX.Element => {
  return (
    <div className="main-content grid grid-rows-[auto,1fr]">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="grid w-full grid-rows-[1fr,auto]">
          {children}
          <footer className="hidden px-4 py-6 sm:block">
            <div className="">
              <p className="text-center text-sm text-gray-600">
                © Kodea Solutions {new Date().getFullYear()}. All rights
                reserved
                <a href="https://uavmatrix.com">
                  {" "}
                  by Bernt Christian Egeland / aka @sinamics
                </a>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
