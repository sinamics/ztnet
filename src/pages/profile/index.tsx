import { useSession } from "next-auth/react";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import EditableField from "~/components/elements/inputField";
import { toast } from "react-hot-toast";
import { api } from "~/utils/api";

const Profile = () => {
  const { data: session, update: sessionUpdate } = useSession();
  const { mutate: userUpdate, error: userError } =
    api.auth.update.useMutation();

  if (userError) {
    toast.error(userError.message);
  }

  return (
    <div className="md:flex">
      <div className="mt-6 px-4 md:mb-0 md:w-1/2">
        <div className="overflow-hidden rounded-lg bg-base-300 px-4 shadow">
          <h2 className="px-4 pt-5 text-lg font-medium ">Profile</h2>
          <div className="divider" />
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <EditableField
                  label="Name"
                  isLoading={!session?.user}
                  fields={[
                    {
                      name: "name",
                      type: "text",
                      placeholder: session?.user?.name,
                    },
                  ]}
                  submitHandler={async (params) =>
                    await sessionUpdate({ update: { ...params } })
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <EditableField
                  isLoading={!session?.user}
                  label="Email"
                  badge={
                    session?.user?.emailVerified
                      ? { text: "Verified", color: "success" }
                      : { text: "Not Verified!", color: "warning" }
                  }
                  fields={[
                    {
                      name: "email",
                      type: "text",
                      placeholder: session?.user?.email,
                    },
                  ]}
                  submitHandler={async (params) =>
                    await sessionUpdate({ update: { ...params } })
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <EditableField
                  isLoading={!session?.user}
                  label="Password"
                  placeholder="******"
                  fields={[
                    {
                      name: "password",
                      type: "password",
                      placeholder: "Current Password",
                    },
                    {
                      name: "newPassword",
                      type: "password",
                      placeholder: "New Password",
                    },
                    {
                      name: "repeatNewPassword",
                      type: "password",
                      placeholder: "Repeat New Password",
                    },
                  ]}
                  submitHandler={(params) => {
                    return new Promise((resolve, reject) => {
                      userUpdate(
                        { ...params },
                        {
                          onSuccess: () => {
                            resolve(true);
                          },
                          onError: () => {
                            reject(false);
                          },
                        }
                      );
                    });
                  }}
                />
              </div>
              {/* <ChangePassword /> */}

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium ">Role</dt>
                <dd className="mt-1 text-sm ">{session?.user.role}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="px-4 md:w-1/2">
        <div className="mt-6 overflow-hidden rounded-lg bg-base-300 px-4">
          <h2 className="px-4 pt-5 text-lg font-medium ">Activity</h2>
          <div className="divider" />
          <div className="px-4 py-5 sm:p-6">
            <p>No activity to display.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

Profile.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
// interface Props {
//   me?: string;
// }
// export const getServerSideProps: GetServerSideProps<Props> = async (
//   context: GetServerSidePropsContext
// ): Promise<GetServerSidePropsResult<Props>> => {
//   const session = await getSession(context);
//   const me = await prisma.user.findUnique({
//     where: {
//       id: session?.user.id,
//     },
//   });

//   return {
//     props: { me: JSON.stringify(me) },
//   };
// };

export default Profile;
