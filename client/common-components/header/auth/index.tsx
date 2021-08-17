/* eslint-disable react-hooks/exhaustive-deps */
import { useMeQuery } from 'client/graphql/generated/dist';
import React, { useEffect } from 'react';
import { Nav, NavbarBrand, NavbarToggler, NavItem, NavLink } from 'reactstrap';
import HeaderDropdown from './headerDropdown';

const Header = (props: any) => {
  const { data: { me = null } = {}, loading: meLoading } = useMeQuery();

  useEffect(() => {
    // close aside when page reloads
    //@ts-ignore
    document.body.classList.add('aside-menu-hidden');
  }, []);

  const mobileSidebarToggle = (e: any) => {
    e.preventDefault();
    //@ts-ignore
    document.body.classList.toggle('sidebar-mobile-show');
  };

  if (meLoading) return <div>Loading...</div>;

  return (
    <header className='app-header navbar'>
      <NavbarToggler className='d-lg-none' onClick={mobileSidebarToggle}>
        <span className='navbar-toggler-icon'></span>
      </NavbarToggler>
      <NavbarBrand href='#'></NavbarBrand>

      <Nav className='ml-auto d-md-inline-flex' navbar>
        <Nav className='ml-auto' navbar>
          {/* Badge name with dropdown  */}
          <HeaderDropdown me={me} {...props} />
          <NavItem className='d-md-down-none'>
            <NavLink href='#'>
              <i className='icon-location-pin'></i>
            </NavLink>
          </NavItem>
        </Nav>
      </Nav>
    </header>
  );
};

export default Header;
