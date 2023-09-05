import type { Component } from 'solid-js';
import { lazy } from 'solid-js';
import { Routes, useRoutes } from '@solidjs/router';
import Comp from './Comp';

const routes = [ 
  {
    path: "/",
    component: Comp,
  },
  {
    path: "/about",
    component: lazy(() => import("./pages/About.js")),
  }
];

const App: Component = () => {
  const Routes = useRoutes(routes);

  return (
    <>
      <Routes />
    </>
  );
};

export default App;
