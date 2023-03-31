/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export default function ProtectedPageRoute(
  context,
  redirectTo, // string route where user will be redirected if they are not authenticated
  getProps // function to fetch initial props
) {
  const userIsAuthenticated = true; // TODO: check if user is authenticated
  if (!userIsAuthenticated) {
    return {
      redirect: {
        destination: redirectTo ?? "/",
        permanent: false,
      },
    };
  }

  if (getProps) {
    return {
      props: getProps(),
    };
  }

  return {
    props: {},
  };
}
