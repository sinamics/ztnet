/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import { Badge, DropdownItem, DropdownMenu, DropdownToggle, Dropdown, Container } from 'reactstrap';
import Avatar from '@material-ui/core/Avatar';
import { Link } from 'react-router-dom';
import { authActions } from '../../common-actions/auth.actions';
import './style.css';

// const propTypes = {
//   notif: PropTypes.bool,
//   accnt: PropTypes.bool,
//   tasks: PropTypes.bool,
//   mssgs: PropTypes.bool,
// };
// const defaultProps = {
//   notif: false,
//   accnt: false,
//   tasks: false,
//   mssgs: false,
// };

type Props = {
  props: any;
  auth: any;
  history: any;
};

const HeaderDropdown: React.FC<any> = (props: Props) => {
  const [state, setState] = useState({ dropdownOpen: false, darkmode: false });
  const [darkTheme, setDarkTheme] = useState(false);

  // Query
  // useLazyQuery due to:: Can't perform a React state update on a component that hasn't mounted yet.

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

  const toggle = () => {
    setState({
      ...state,
      dropdownOpen: !state.dropdownOpen,
    });
  };

  const logout = () => {
    authActions.Logout().then(async () => {
      //@ts-ignore
      window.location.href = '/';
    });
  };

  const dropAccnt = ({ firstname, role }: any) => {
    return (
      <Dropdown nav isOpen={state.dropdownOpen} toggle={toggle}>
        <DropdownToggle nav>
          {/* <img src={"img/avatars/6.jpg"} className="img-avatar" alt="admin@bootstrapmaster.com" /> */}
          <Container>
            <span className='d-flex justify-content-between'>
              <div>
                <Avatar>{firstname?.charAt(0)}</Avatar>
              </div>

              <div className='d-none d-lg-block align-self-center mt-1 ml-2'>
                <p style={{ fontSize: 18 }}>{firstname}</p>
              </div>
            </span>
          </Container>
        </DropdownToggle>
        <DropdownMenu right>
          <DropdownItem header tag='div' className='text-center'>
            <strong>Settings</strong>
          </DropdownItem>

          <Link to='/profile/me' className='dropdown-item' style={{ padding: 0 }}>
            <DropdownItem>
              <i className='fa fa-user'></i> Profile
            </DropdownItem>
          </Link>

          {role?.includes('ADMIN') && (
            <Link to='/admin' className='dropdown-item' style={{ padding: 0 }}>
              <DropdownItem>
                <i className='far fa-star'></i> Admin
              </DropdownItem>
            </Link>
          )}
          {/* <Link to='/profile/subscription' className='dropdown-item' style={{ padding: 0 }}>
            <DropdownItem>
              <i className='far fa-credit-card'></i> Subscription
            </DropdownItem>
          </Link> */}
          <DropdownItem onClick={toggleTheme}>
            <i className='far fa-lightbulb'></i> {darkTheme ? 'Lightmode' : 'Darkmode'}
          </DropdownItem>
          <DropdownItem onClick={() => logout()}>
            <i className='fa fa-lock'></i> Logout
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  };

  const dropMssgs = () => {
    const itemsCount = 7;
    return (
      <Dropdown nav className='d-md-down-none' isOpen={state.dropdownOpen} toggle={toggle}>
        <DropdownToggle nav>
          <i className='icon-envelope-letter'></i>
          <Badge pill color='info'>
            {itemsCount}
          </Badge>
        </DropdownToggle>
        <DropdownMenu right className='dropdown-menu-lg'>
          <DropdownItem header tag='div'>
            <strong>You have {itemsCount} messages</strong>
          </DropdownItem>
          <DropdownItem href='#'>
            <div className='message'>
              <div className='py-3 mr-3 float-left'>
                <div className='avatar'>
                  {/* <img src={"img/avatars/7.jpg"} className="img-avatar" alt="" /> */}
                  <Badge className='avatar-status' color='success'></Badge>
                </div>
              </div>
              <div>
                <small className='text-muted'>John Doe</small>
                <small className='text-muted float-right mt-1'>Just now</small>
              </div>
              <div className='text-truncate font-weight-bold'>
                <span className='fa fa-exclamation text-danger'></span> Important message
              </div>
              <div className='small text-muted text-truncate'>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt...
              </div>
            </div>
          </DropdownItem>
          <DropdownItem href='#'>
            <div className='message'>
              <div className='py-3 mr-3 float-left'>
                <div className='avatar'>
                  {/* <img src={"img/avatars/6.jpg"} className="img-avatar" alt="admin@bootstrapmaster.com" /> */}
                  <Badge className='avatar-status' color='warning'></Badge>
                </div>
              </div>
              <div>
                <small className='text-muted'>Jane Doe</small>
                <small className='text-muted float-right mt-1'>5 minutes ago</small>
              </div>
              <div className='text-truncate font-weight-bold'>Lorem ipsum dolor sit amet</div>
              <div className='small text-muted text-truncate'>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt...
              </div>
            </div>
          </DropdownItem>
          <DropdownItem href='#'>
            <div className='message'>
              <div className='py-3 mr-3 float-left'>
                <div className='avatar'>
                  {/* <img src={"img/avatars/5.jpg"} className="img-avatar" alt="admin@bootstrapmaster.com" /> */}
                  <Badge className='avatar-status' color='danger'></Badge>
                </div>
              </div>
              <div>
                <small className='text-muted'>Janet Doe</small>
                <small className='text-muted float-right mt-1'>1:52 PM</small>
              </div>
              <div className='text-truncate font-weight-bold'>Lorem ipsum dolor sit amet</div>
              <div className='small text-muted text-truncate'>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt...
              </div>
            </div>
          </DropdownItem>
          <DropdownItem href='#'>
            <div className='message'>
              <div className='py-3 mr-3 float-left'>
                <div className='avatar'>
                  <img src={'img/avatars/4.jpg'} className='img-avatar' alt='admin@bootstrapmaster.com' />
                  <Badge className='avatar-status' color='info'></Badge>
                </div>
              </div>
              <div>
                <small className='text-muted'>Joe Doe</small>
                <small className='text-muted float-right mt-1'>4:03 AM</small>
              </div>
              <div className='text-truncate font-weight-bold'>Lorem ipsum dolor sit amet</div>
              <div className='small text-muted text-truncate'>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt...
              </div>
            </div>
          </DropdownItem>
          <DropdownItem href='#' className='text-center'>
            <strong>View all messages</strong>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  };

  const { accnt, mssgs, me }: any = props;
  if (!me) return null;
  return accnt ? dropAccnt(me) : mssgs ? dropMssgs() : null;
};

export default withRouter(HeaderDropdown);
