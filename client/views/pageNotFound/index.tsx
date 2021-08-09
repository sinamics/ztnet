/**
 * NotFoundPage
 *
 * This is the page we show when the user visits a url that doesn't have a route
 *
 */

import React from "react";
import { Link } from "react-router-dom";
import "./style.css";
function NotFound() {
  return (
    <div id="not-found-container">
      <div className="not-found-content">
        <h2>404</h2>
        <h4>Opps! Page not found</h4>
        <p>The page you were looking for doesn't exist. You may have mistyped the address or the page may have moved.</p>
        <Link to="/login">Back To Login</Link>
      </div>
    </div>
  );
}

export default NotFound;
