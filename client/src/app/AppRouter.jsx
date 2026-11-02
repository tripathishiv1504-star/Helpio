import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './AppLayout.jsx';
import RequireRole from './RequireRole.jsx';
import NotFound from './NotFound.jsx';

// Dynamically discover all feature routes
const featureRouteModules = import.meta.glob('../features/*/routes.jsx', { eager: true });

export function AppRouter() {
  const routes = [];

  for (const filePath in featureRouteModules) {
    const mod = featureRouteModules[filePath];
    const routeConfig = mod.default || mod.routes || [];
    const routeList = Array.isArray(routeConfig) ? routeConfig : [routeConfig];

    for (const r of routeList) {
      if (r && r.path && r.element) {
        routes.push(r);
      }
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {routes.map((route) => {
          const element =
            route.roles && route.roles.length > 0 ? (
              <RequireRole roles={route.roles}>{route.element}</RequireRole>
            ) : (
              route.element
            );

          return (
            <Route
              key={route.path}
              path={route.path === '/' ? undefined : route.path.replace(/^\//, '')}
              index={route.path === '/'}
              element={element}
            />
          );
        })}
        {/* Fallback 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
