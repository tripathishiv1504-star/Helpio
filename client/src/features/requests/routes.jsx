import React from 'react';
import UserDashboard from './UserDashboard.jsx';
import NewRequestPage from './NewRequestPage.jsx';
import RequestsListPage from './RequestsListPage.jsx';
import RequestDetailPage from './RequestDetailPage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/dashboard',
    element: <UserDashboard />,
    roles: [ROLES.USER],
    nav: {
      label: 'Dashboard',
      order: 1,
      icon: '🏠',
    },
  },
  {
    path: '/requests',
    element: <RequestsListPage />,
    roles: [ROLES.USER],
    nav: {
      label: 'My Requests',
      order: 2,
      icon: '📋',
    },
  },
  {
    path: '/requests/new',
    element: <NewRequestPage />,
    roles: [ROLES.USER],
  },
  {
    path: '/requests/:id',
    element: <RequestDetailPage />,
    roles: [ROLES.USER, ROLES.HELPER, ROLES.ADMIN],
  },
];
