//@ts-nocheck
import React from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import nav from './_nav';
import SidebarFooter from '../sidebarFooter';
import SidebarForm from '../sidebarForm';
import SidebarHeader from '../sidebarHeader';
import SidebarMinimizer from '../sidebarMinimizer';
import { useMeQuery } from 'client/graphql/generated/dist';
import { Icon } from 'semantic-ui-react';

const Sidebar = (props: any) => {
  const { loading: meLoading, data: { me = null } = {} } = useMeQuery();

  const handleClick = (e: any) => {
    e.preventDefault();
    e.target.parentElement.classList.toggle('open');
  };

  const activeRoute = (routeName: any, props: any) => {
    // return props.location.pathname.indexOf(routeName) > -1 ? 'nav-item nav-dropdown open' : 'nav-item nav-dropdown';
    return props.location.pathname.indexOf(routeName) > -1 ? 'nav-item nav-dropdown open' : 'nav-item nav-dropdown';
  };

  const hideMobile = () => {
    if (document.body.classList.contains('sidebar-mobile-show')) {
      document.body.classList.toggle('sidebar-mobile-show');
    }
  };

  // todo Sidebar nav secondLevel
  // secondLevelActive(routeName) {
  //   return props.location.pathname.indexOf(routeName) > -1 ? "nav nav-second-level collapse in" : "nav nav-second-level collapse";
  // }

  // badge addon to NavItem
  const badge = (badge: any) => {
    if (badge) {
      // const classes = classNames(badge.class);
      return (
        <Icon size='small' className='badge' name={badge.icon}>
          {badge.text}
        </Icon>
      );
    }
    return null;
  };

  // simple wrapper for nav-title item
  const wrapper = (item: any) => {
    return item.wrapper && item.wrapper.element ? React.createElement(item.wrapper.element, item.wrapper.attributes, item.name) : item.name;
  };

  // nav list section title
  const title = (title: any, key: number) => {
    const classes = classNames('nav-title', title.class);
    return (
      <li key={key} className={classes}>
        {wrapper(title)}{' '}
      </li>
    );
  };

  // nav list divider
  const divider = (divider: any, key: number) => {
    const classes = classNames('divider', divider.class);
    return <li key={key} className={classes}></li>;
  };

  // nav label with nav link
  const navLabel = (item: any, key: number) => {
    const classes = {
      item: classNames('hidden-cn', item.class),
      link: classNames('nav-label', item.class ? item.class : ''),
      icon: classNames(
        !item.icon ? 'fa fa-circle' : item.icon,
        item.label.variant ? `text-${item.label.variant}` : '',
        item.label.class ? item.label.class : ''
      ),
    };
    return navLink(item, key, classes);
  };

  // nav item with nav link
  const navItem = (item: any, key: number) => {
    const classes = {
      item: classNames(item.class),
      link: classNames('nav-link', item.variant ? `nav-link-${item.variant}` : ''),
      icon: classNames(item.icon),
    };
    return navLink(item, key, classes);
  };

  // nav link
  const navLink = (item: any, key: number, classes: any) => {
    const url = item.url ? item.url : '';
    return (
      <nav className={`${classes.item} nav-item`} key={key}>
        {isExternal(url) ? (
          <a href={url} className={classes.link} active>
            {badge(item.badge)}
            {item.name}
          </a>
        ) : (
          <NavLink to={url} className={`${classes.link}`} activeClassName='active' onClick={hideMobile}>
            {badge(item.badge)}
            {item.name}
          </NavLink>
        )}
      </nav>
    );
  };

  // nav dropdown
  const navDropdown = (item: any, key: number) => {
    return (
      <li key={key} className={activeRoute(item.url, props)}>
        <div className='nav-link nav-dropdown-toggle' onClick={handleClick}>
          <i className={item.icon}></i>
          {item.name}
        </div>
        <ul className='nav-dropdown-items'>{navList(item.children)}</ul>
      </li>
    );
  };

  // nav type
  const navType = (item: any, idx: number) =>
    item.title
      ? title(item, idx)
      : item.divider
      ? divider(item, idx)
      : item.label
      ? navLabel(item, idx)
      : item.children
      ? navDropdown(item, idx)
      : navItem(item, idx);

  // nav list
  const navList = (items: any) => {
    return items.map((item: any, index: number) => {
      // !TODO
      //Bc. Check if user role is set, and hide elements if not correct permissions.
      // if (item.role) {
      //   if (!item.role.some((r) => me.role.includes(r))) return null;
      // }
      //Bc Check if user has a valid subscription
      // if (item.subscription) {
      //   if (!me.role.includes("superuser") && (!me.subscription || !me.subscription.valid)) return null;
      // }
      return navType(item, index);
    });
  };

  const isExternal = (url: any) => {
    const link = url ? url.substring(0, 4) : '';
    return link === 'http';
  };
  if (meLoading || !me) return null;
  // sidebar-nav root
  return (
    <div className='sidebar'>
      <SidebarHeader />
      <SidebarForm />
      <nav className='sidebar-nav'>
        <ul className='nav'>{navList(nav.items)}</ul>
      </nav>
      <SidebarFooter />
      <SidebarMinimizer />
    </div>
  );
};

export default Sidebar;
