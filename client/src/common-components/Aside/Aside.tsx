import React, { useState } from 'react';
import { TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';
import { Changelog } from 'src/app/changelog';

const Aside: React.FC<any> = () => {
  const [state, setState] = useState({ activeTab: '1' });

  const toggle = (tab: any) => {
    if (state.activeTab !== tab) {
      setState({
        activeTab: tab,
      });
    }
  };
  return (
    <aside className='aside-menu'>
      <Nav tabs>
        <NavItem>
          <NavLink
            className={classnames({ active: state.activeTab === '1' })}
            onClick={() => {
              toggle('1');
            }}
          >
            <i className='fas fa-code-branch'></i>
          </NavLink>
        </NavItem>
        {/* <NavItem>
          <NavLink
            className={classnames({ active: state.activeTab === '2' })}
            onClick={() => {
              toggle('2');
            }}
          >
            <i className='fas fa-upload'></i>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classnames({ active: state.activeTab === '3' })}
            onClick={() => {
              toggle('3');
            }}
          >
            <i className='fas fa-cog'></i>
          </NavLink>
        </NavItem> */}
      </Nav>
      <TabContent activeTab={state.activeTab}>
        <TabPane tabId='1'>
          <Changelog />
        </TabPane>
      </TabContent>
    </aside>
  );
};

export default Aside;
