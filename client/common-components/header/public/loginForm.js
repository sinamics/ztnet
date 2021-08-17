import React from 'react';

const LoginForm = () => {
  return (
    <div id='loginform'>
      {/* <div id='facebook'>
          <i className='fa fa-facebook'></i>
          <div id='connect'>Connect with Facebook</div>
        </div> */}
      <div id='mainlogin'>
        {/* <div id='or'>or</div> */}
        <h1>Dashboard Login</h1>
        <form action='#'>
          <input type='text' placeholder='username or email' value='' required />
          <input type='password' placeholder='password' value='' required />
          <button type='submit'>
            <i className='fa fa-arrow-right'></i>
          </button>
        </form>
        <div id='note'>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a href='#'>Forgot your password?</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
