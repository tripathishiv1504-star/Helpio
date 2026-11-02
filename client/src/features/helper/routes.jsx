import React from 'react';
import HelperDashboard from './HelperDashboard.jsx';
import HelperOnboarding from './HelperOnboarding.jsx';
import HelperProfilePage from './HelperProfilePage.jsx';
import HelperAvailabilityPage from './HelperAvailabilityPage.jsx';
import HelperEarningsPage from './HelperEarningsPage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/helper',
    element: <HelperDashboard />,
    roles: [ROLES.HELPER],
    nav: {
      label: 'Helper Dashboard',
      order: 2,
      icon: '🛠️',
    },
  },
  {
    path: '/helper/onboard',
    element: <HelperOnboarding />,
    roles: [ROLES.HELPER],
  },
  {
    path: '/helper/profile',
    element: <HelperProfilePage />,
    roles: [ROLES.HELPER],
    nav: {
      label: 'Skills & Area',
      order: 3,
      icon: '📍',
    },
  },
  {
    path: '/helper/availability',
    element: <HelperAvailabilityPage />,
    roles: [ROLES.HELPER],
    nav: {
      label: 'Availability',
      order: 4,
      icon: '📅',
    },
  },
  {
    path: '/helper/earnings',
    element: <HelperEarningsPage />,
    roles: [ROLES.HELPER],
    nav: {
      label: 'Earnings',
      order: 5,
      icon: '💰',
    },
  },
];
