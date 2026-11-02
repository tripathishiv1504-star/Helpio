import React from 'react';
import AdminDashboard from './AdminDashboard.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/admin',
    element: <AdminDashboard />,
    roles: [ROLES.ADMIN],
    nav: {
      label: 'Admin',
      order: 99,
      icon: '🛡️',
    },
  },
];
