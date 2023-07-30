import React from "react";
import i18n from "./i18n";
const ChangeLocale = () => {
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  return <div></div>;
};

export default ChangeLocale;
