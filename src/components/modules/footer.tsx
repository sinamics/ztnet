import React from "react";

const Footer = () => (
  <footer className="hidden px-4 py-6 sm:block">
    <div className="grid grid-cols-3">
      <div></div>
      <p className="text-center text-sm text-gray-600">
        © Kodea Solutions {new Date().getFullYear()}. All rights reserved
        <a href="https://uavmatrix.com">
          {" "}
          by Bernt Christian Egeland / aka @sinamics
        </a>
      </p>
      {process.env.NEXT_PUBLIC_APP_VERSION ? (
        <p className="text-right text-sm text-gray-600">
          {process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
      ) : (
        <div></div>
      )}
    </div>
  </footer>
);

export default Footer;
