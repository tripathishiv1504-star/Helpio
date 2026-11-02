import React from 'react';
import LandingPage from './LandingPage.jsx';

export default [
  {
    path: '/',
    element: <LandingPage />,
    // Public route, no nav entry for home as logo links to /
  },
];
