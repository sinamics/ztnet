import type { ReactNode } from "react";
import Header from "../modules/header";
import Sidebar from "../modules/sidebar";
import Footer from "../modules/footer";

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
        <div className="grid w-full grid-rows-[1fr,auto] overflow-auto">
          {children}
          <Footer />
        </div>
      </div>
    </div>
  );
};
