/* eslint-disable react-hooks/exhaustive-deps */

import { useMeQuery } from 'client/graphql/generated/dist';
import React from 'react';

// import { Icon } from 'semantic-ui-react';
import HeaderDropdown from './headerDropdown';

const Header = (props: any) => {
  const { data: { me = null } = {}, loading: meLoading } = useMeQuery();

  if (meLoading) return <div>Loading...</div>;
  const mobileSidebarToggle = (e: any) => {
    e.preventDefault();
    //@ts-ignore
    document.body.classList.toggle('sidebar-mobile-show');
  };
  return (
    <header className='app-header navbar'>
      <button onClick={mobileSidebarToggle} className='d-lg-none navbar-toggler'>
        <span className='navbar-toggler-icon ml-4'></span>
      </button>
      <span className='navbar-brand'></span>

      <span className='mr-5'>
        <HeaderDropdown me={me} {...props} />
      </span>
    </header>
  );
};

export default Header;
