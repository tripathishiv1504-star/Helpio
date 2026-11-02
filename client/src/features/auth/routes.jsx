import React from 'react';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    roles: [ROLES.USER, ROLES.HELPER, ROLES.ADMIN],
  },
];
