import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './style.css';

interface Props {
  pathname: String;
}
const Header: React.FC<Props> = (): JSX.Element => {
  useEffect(() => {
    let mainNav = document.getElementById('header-nav');
    let navBarToggle = document.getElementById('nav-ul');

    //I'm using "click" but it works with any event
    document.addEventListener('click', function (event: any) {
      var isClickInside = mainNav?.contains(event.target);

      if (!isClickInside) {
        return navBarToggle?.classList.remove('showing');
      }
      navBarToggle?.classList.toggle('showing');
    });
  });
  return (
    <div className='wrapper'>
      <header>
        <nav id='navbar'>
          <div className='menu-icon' id='header-nav'>
            <i className='fa fa-bars fa-2x'></i>
          </div>

          <div className='menu'>
            <div className='logo'>
              <Link style={{ textDecoration: 'none' }} to='/'>
                {process.env.REACT_APP_SITE_NAME}
              </Link>
              <small className='d-none d-lg-block '>zerotier controller</small>
            </div>

            <ul id='nav-ul'>
              <li>
                <a href='https://uavmatrix.com'>Store</a>
              </li>
              <li>
                <a href='https://uavmatrix.com/contact-us/'>Contact us</a>
              </li>
            </ul>
          </div>
        </nav>
      </header>
    </div>
  );
};

export default Header;
