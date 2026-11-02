import React from 'react';
import HelperJobsPage from './HelperJobsPage.jsx';
import { ROLES } from '@shared/constants.js';

export default [
  {
    path: '/helper/jobs',
    element: <HelperJobsPage />,
    roles: [ROLES.HELPER],
    nav: {
      label: 'My Jobs',
      order: 3,
      icon: '🛠️',
    },
  },
];
