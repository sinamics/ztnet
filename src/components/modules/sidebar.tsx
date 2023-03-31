import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { useSidebarStore } from "~/utils/store";
// import type { ReactNode } from "react";
// import Header from "./header";

// interface Props {
//   children: ReactNode;
// }

const Sidebar = (): JSX.Element => {
  const { open, toggle } = useSidebarStore();
  const sidebarRef = useRef<HTMLDivElement>();
  const router = useRouter();
  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (open) {
        if (!sidebarRef.current) return;
        toggle();
        // if (
        //   sidebarRef.current &&
        //   !sidebarRef.current?.contains(event.target as Node)
        // ) {
        //   toggle();
        // }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, toggle, sidebarRef]);

  return (
    <aside
      ref={sidebarRef}
      className={`fixed h-full w-64 -translate-x-full transform flex-row bg-neutral-focus transition-transform duration-150 ease-in md:relative md:shadow
    ${open ? "z-10  translate-x-0" : "md:translate-x-0"}`}
    >
      <div className="sidebar-content px-4 py-3">
        <ul className="flex w-full flex-col">
          <li className="my-px">
            <span className="my-4 flex px-4 text-sm font-medium uppercase text-primary">
              Navigation
            </span>
          </li>
          <li className="my-px">
            <Link
              href="/dashboard"
              className={`flex h-10 flex-row items-center rounded-lg px-3  
              ${
                router.pathname === "/dashboard"
                  ? "bg-gray-100 text-gray-700"
                  : "hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-center text-lg text-gray-400">
                <svg
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span className="ml-3">Dashboard</span>
            </Link>
          </li>

          <li className="my-px">
            <Link
              href="/network"
              className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
                router.pathname === "/network"
                  ? "bg-gray-100 text-gray-700"
                  : "hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-center text-lg text-gray-400">
                <svg
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </span>
              <span className="ml-3">Networks</span>
            </Link>
          </li>

          <li className="my-px">
            <span className="my-4 flex px-4 text-sm font-medium uppercase text-gray-300">
              Account
            </span>
          </li>
          <li className="my-px">
            <a
              href="#"
              className="flex h-10 flex-row items-center rounded-lg px-3 text-gray-300 hover:bg-gray-100 hover:text-gray-700"
            >
              <span className="flex items-center justify-center text-lg text-gray-400">
                <svg
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <span className="ml-3">Profile</span>
            </a>
          </li>
          <li className="my-px">
            <a
              href="#"
              className="flex h-10 flex-row items-center rounded-lg px-3 text-gray-300 hover:bg-gray-100 hover:text-gray-700"
            >
              <span className="flex items-center justify-center text-lg text-gray-400">
                <svg
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span className="ml-3">Settings</span>
            </a>
          </li>
          <li className="my-px">
            <a
              href="#"
              onClick={() => void signOut()}
              className="flex h-10 flex-row items-center rounded-lg px-3 text-gray-300 hover:bg-gray-100 hover:text-gray-700"
            >
              <span className="flex items-center justify-center text-lg text-red-400">
                <svg
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="ml-3">Logout</span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
