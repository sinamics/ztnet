/* eslint-disable no-underscore-dangle */
// import * as React from 'react';
// import { Route, Redirect } from 'react-router-dom';
// import { useMeQuery } from 'client/graphql/generated/dist';

// interface props {
//   component: React.ElementType;
// }

// const SubscriptionRoute: React.FC<{ component: React.FC<props>; path: string; exact: boolean }> = (props): JSX.Element => {
//   const { loading, error, data: { me = {} } = {} } = useMeQuery();

//   if (loading) return <div>Loading Subscription Status</div>;

//   const restrictedAccess = (!me?.subscription || !me?.subscription.valid) && !me?.role?.includes("superuser");

//   if (error) return <div>{`${error}`}</div>;

//   return !restrictedAccess ? (
//     <Route path={props.path} exact={props.exact} component={props.component} />
//   ) : (
//     <Redirect to="/login" />
//   );
// };
// export default SubscriptionRoute;
