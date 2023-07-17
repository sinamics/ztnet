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
    <div className="main-content grid h-screen grid-rows-[auto,1fr]">
      <Header />
      <div className="grid grid-rows-[1fr,auto] md:grid-cols-[1fr,auto]">
        <Sidebar />
        <div className="custom-overflow custom-scrollbar grid-rows-[1fr,auto] overflow-auto">
          {children}
          <Footer />
        </div>
      </div>
    </div>
  );
};
