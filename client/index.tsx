import React from 'react';
import ReactDOM from 'react-dom';
import App from './app/app';
import * as serviceWorker from './utils/serviceWorker';
import { BrowserRouter } from 'react-router-dom';

// Apollo provider
import { ApolloProvider } from '@apollo/client';
import { client } from './utils/apolloLink';

// import '@fortawesome/fontawesome-free/css/all.min.css';

// Import Main styles for this application
import './scss/style.scss';

const MOUNT_NODE = document.getElementById('root');

ReactDOM.render(
  <BrowserRouter>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </BrowserRouter>,
  MOUNT_NODE
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
