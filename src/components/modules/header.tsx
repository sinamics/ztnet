import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { globalSiteTitle } from "~/utils/global";
import { useSidebarStore } from "~/utils/store";

const Themes = ["light", "dark", "black", "business", "system", "forest"];

const Header = () => {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toggle } = useSidebarStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <header className="header bg-base-300 px-4 py-1 shadow">
      <div className="header-content flex flex-row items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-8 w-8 sm:block md:hidden"
          onClick={toggle}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
        <div className="hidden md:inline-flex">
          <a href="#" className="inline-flex flex-row items-center">
            <span className="ml-1 text-2xl font-bold uppercase leading-10 text-accent">
              {globalSiteTitle}
            </span>
          </a>
        </div>
        <div className="ml-auto flex">
          {/* <div className="sidebar-header flex items-center justify-center py-4"> */}

          {/* <a href="#" className="flex flex-row items-center"> */}
          <div className="dropdown-end dropdown">
            <label tabIndex={0} className="btn m-1">
              {theme.toUpperCase()}
            </label>
            <ul
              tabIndex={0}
              className="menu dropdown-content rounded-box z-30 w-52 bg-primary p-2 shadow"
            >
              {Themes.map((theme) => {
                return (
                  <li key={theme} onClick={() => setTheme(theme)}>
                    <a>{theme.toUpperCase()}</a>
                  </li>
                );
              })}
            </ul>
          </div>
          <span className="ml-2 flex flex-col justify-center">
            <span className="truncate font-semibold leading-none tracking-wide">
              {session.data?.user.name}
            </span>
            <span className="mt-1 w-20 truncate text-xs leading-none text-gray-500">
              {session.data?.user.role}
            </span>
          </span>
          {/* </a> */}
        </div>
      </div>
    </header>
  );
};

export default Header;
