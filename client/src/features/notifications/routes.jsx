import React from 'react';
import NotificationsPage from './NotificationsPage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/notifications',
    element: <NotificationsPage />,
    roles: [ROLES.USER, ROLES.HELPER, ROLES.ADMIN],
  },
];
