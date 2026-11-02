import React from 'react';
import HelperOffersPage from './HelperOffersPage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/helper/offers',
    element: <HelperOffersPage />,
    roles: [ROLES.HELPER],
    nav: {
      label: 'Incoming Offers',
      order: 2,
      icon: '⚡',
    },
  },
];
