import React, { useState, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import { authActions } from '../../../common-actions/auth.actions';
import { Icon, Dropdown, Header } from 'semantic-ui-react';

type Props = {
  me: any;
  history: any;
};

const HeaderDropdown: React.FC<any> = ({ me, history }: Props) => {
  const [darkTheme, setDarkTheme] = useState(false);

  useEffect(() => {
    // loadProfile();
    //@ts-ignore
    let theme: any = window.localStorage.getItem('Theme');
    //@ts-ignore
    document.documentElement.setAttribute('data-theme', theme);
    setDarkTheme(theme === 'dark' ? true : false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    let theme = darkTheme === true ? 'light' : 'dark';
    setDarkTheme(() => !darkTheme);
    //@ts-ignore
    document.documentElement.setAttribute('data-theme', theme);
    //@ts-ignore
    window.localStorage.setItem('Theme', theme);
  };

  const logout = () => {
    authActions.Logout().then(async () => {
      //@ts-ignore
      window.location.href = '/';
    });
  };

  const trigger = (
    <Header className='themeTextColor' as='span' size='tiny'>
      <Icon name='settings' />
      <Header.Content className='d-none d-sm-table-cell'>
        {me.firstname}
        <Header.Subheader className='themeTextColor'>Manage your preferences</Header.Subheader>
      </Header.Content>
    </Header>
  );

  const routes = (route: any) => {
    history.push(route);
  };

  return (
    <Dropdown basic item direction='left' floating trigger={trigger} icon={null}>
      <Dropdown.Menu>
        <Dropdown.Header content='Settings' />
        <Dropdown.Item className='dropdown-item' onClick={() => routes('/profile/me')}>
          <Icon className='themeTextColor' name='user' /> Profile
        </Dropdown.Item>
        {me.role?.includes('ADMIN') && (
          <Dropdown.Item className='dropdown-item' onClick={() => routes('/admin')}>
            <Icon className='themeTextColor' name='star' /> Admin
          </Dropdown.Item>
        )}
        <Dropdown.Item onClick={toggleTheme} className='dropdown-item'>
          <Icon className='themeTextColor' name='sun' /> {darkTheme ? 'Lightmode' : 'Darkmode'}
        </Dropdown.Item>

        <Dropdown.Item onClick={logout} className='dropdown-item'>
          <Icon className='themeTextColor' name='unlock' /> Logout
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default withRouter(HeaderDropdown);
