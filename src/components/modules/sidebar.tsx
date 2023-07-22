import { signOut, useSession } from "next-auth/react";
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
  const { data: session } = useSession();

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
      className={`fixed h-full w-64 -translate-x-full transform flex-row bg-base-200 transition-transform duration-150 ease-in md:relative md:shadow
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
          {session?.user.role === "ADMIN" ? (
            <>
              <li className="my-px">
                <span className="my-4 flex px-4 text-sm font-medium uppercase text-primary ">
                  Admin
                </span>
              </li>
              <li className="my-px">
                <Link
                  href="/admin?tab=site-setting"
                  className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
                router.pathname === "/admin?tab=site-setting"
                  ? "bg-gray-100 text-gray-700"
                  : "hover:bg-slate-700"
              }`}
                >
                  <span className="flex items-center justify-center text-lg text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </span>
                  <span className="ml-3">Settings</span>
                </Link>
              </li>
              <li className="my-px">
                <Link
                  href="/admin?tab=mail-setting"
                  className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
                router.pathname === "/admin?tab=mail-setting"
                  ? "bg-gray-100 text-gray-700"
                  : "hover:bg-slate-700"
              }`}
                >
                  <span className="flex items-center justify-center text-lg text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </span>
                  <span className="ml-3">Mail</span>
                </Link>
              </li>
              <li className="my-px">
                <Link
                  href="/admin?tab=members"
                  className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
                router.pathname === "/admin?tab=members"
                  ? "bg-gray-100 text-gray-700"
                  : "hover:bg-slate-700"
              }`}
                >
                  <span className="flex items-center justify-center text-lg text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </span>
                  <span className="ml-3">Members</span>
                </Link>
              </li>
              <li className="my-px">
                <Link
                  href="/admin?tab=controller"
                  className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
                router.pathname === "/admin?tab=controller"
                  ? "bg-gray-100 text-gray-700"
                  : "hover:bg-slate-700"
              }`}
                >
                  <span className="flex items-center justify-center text-lg text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
                      />
                    </svg>
                  </span>
                  <span className="ml-3">ZT Controller</span>
                </Link>
              </li>
            </>
          ) : null}
          <li className="my-px">
            <span className="my-4 flex px-4 text-sm font-medium uppercase text-primary">
              Account
            </span>
          </li>
          <li className="my-px">
            <Link
              href="/profile"
              className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
                router.pathname === "/profile"
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
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <span className="ml-3">Profile</span>
            </Link>
          </li>
          {/* <li className="my-px">
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
          </li> */}
          <li className="my-px">
            <a
              href="#"
              onClick={() => void signOut({ callbackUrl: "/" })}
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
