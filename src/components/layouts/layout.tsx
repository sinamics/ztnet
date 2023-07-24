import type { ReactNode } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "../modules/footer";

interface Props {
  children: ReactNode;
}

export const LayoutPublic = ({ children }: Props): JSX.Element => {
  return <>{children}</>;
};

export const LayoutAuthenticated = ({ children }: Props): JSX.Element => {
  return (
    <div className="main-content">
      <Header />
      <div className="grid md:grid-cols-[255px,minmax(0,1fr)]">
        <Sidebar />
        <div className="custom-overflow custom-scrollbar overflow-auto">
          {children}
          <Footer />
        </div>
      </div>
    </div>
  );
};
