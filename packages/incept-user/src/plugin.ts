//stackpress
import type Server from '@stackpress/ingest/dist/Server';
//user
import type { PermissionList } from './types';
import Session from './Session';

/**
 * This interface is intended for the Incept library.
 */
export default function plugin(server: Server) {
  //on config, register session plugin
  server.on('config', req => {
    const server = req.context;
    const name = server.config.path('session.name', 'session');
    const seed = server.config.path('session.seed', 'abc123');
    const access = server.config.path<PermissionList>('session.access', {});
    //make a new session
    const session = new Session(name, seed, access);
    //add session as a project plugin
    server.register('session', session);
  });
  //on listen, add user events
  server.on('listen', req => {
    const server = req.context;
    server.imports.on('auth-search', () => import('./events/search'), -10000);
    server.imports.on('auth-detail', () => import('./events/detail'), -10000);
    server.imports.on('auth-get', () => import('./events/detail'), -10000);
    server.imports.on('auth-signup', () => import('./events/signup'));
    server.imports.on('auth-signin', () => import('./events/signin'));
    server.imports.on('auth-signout', () => import('./events/signout'));
    server.imports.on('authorize', () => import('./events/authorize'));
    server.imports.on('me', () => import('./events/session'));
    server.imports.on('request', () => import('./pages/authorize'));
  });
  //on route, add user routes
  server.on('route', req => {
    const server = req.context;
    server.imports.all('/auth/signin', () => import('./pages/signin'));
    server.imports.all('/auth/signin/:type', () => import('./pages/signin'));
    server.imports.all('/auth/signup', () => import('./pages/signup'));
    server.imports.all('/auth/signout', () => import('./pages/signout'));

    server.view.all('/auth/signin', '@stackpress/incept-user/dist/templates/signin', -100);
    server.view.all('/auth/signin/:type', '@stackpress/incept-user/dist/templates/signin', -100);
    server.view.all('/auth/signup', '@stackpress/incept-user/dist/templates/signup', -100);
  });
};