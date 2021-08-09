import { setAccessToken } from '../utils/accessToken';
import { apiUrl } from 'config';

let isProduction = process.env.NODE_ENV === 'production';

export const authActions = {
  Logout,
};

function Logout() {
  setAccessToken('');
  return fetch(`${apiUrl}/logout`, {
    method: 'POST',
    credentials: isProduction ? 'same-origin' : 'include',
    // redirect: "follow",
  });
}

// Setup config/headers and token
export const tokenConfig = (getState) => {
  // Get token from localstorage
  const { token, refreshToken } = getState().auth;

  // Headers
  const config = {
    headers: {
      'Content-type': 'application/json',
    },
  };

  // If token, add to headers
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  if (refreshToken) {
    config.headers['x-refresh-token'] = refreshToken;
  }

  return config;
};
