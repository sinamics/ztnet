/* eslint-disable react-hooks/exhaustive-deps */

import { useMeQuery } from 'client/graphql/generated/dist';
import React from 'react';
import HeaderDropdown from './headerDropdown';

const Header = (props: any) => {
  const { data: { me = null } = {}, loading: meLoading } = useMeQuery();

  if (meLoading) return <div>Loading...</div>;

  return (
    <header className='app-header navbar'>
      <span className='navbar-brand'></span>

      <span className='mr-5'>
        <HeaderDropdown me={me} {...props} />
      </span>
    </header>
  );
};

export default Header;
