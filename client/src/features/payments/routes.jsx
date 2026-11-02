import React from 'react';
import PaymentsHistoryPage from './PaymentsHistoryPage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/payments',
    element: <PaymentsHistoryPage />,
    roles: [ROLES.USER, ROLES.HELPER],
    nav: {
      label: 'Payments',
      order: 30,
      icon: '💳',
    },
  },
];
