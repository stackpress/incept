//modules
import path from 'node:path';
//stackpress
import type Server from '@stackpress/ingest/dist/Server';
//local
import type { APIConfig, Endpoint, Application, Session } from './types';
import { authorize, unauthorized } from './helpers';

/**
 * This interface is intended for the Incept library.
 */
export default function plugin(server: Server) {
  //on listen, add user routes
  server.on('listen', req => {
    const server = req.context;
    server.all('/auth/oauth/token', path.join(__dirname, 'pages/token'));
    server.all('/auth/oauth', path.join(__dirname, 'pages/oauth'));
    const { endpoints = [] } = server.config<APIConfig['api']>('api') || {};
    for (const endpoint of endpoints) {
      if (endpoint.type === 'session') {
        session(endpoint, server);
      } else if (endpoint.type === 'app') {
        app(endpoint, server);
      } else if (endpoint.type === 'public') {
        open(endpoint, server);
      }
    }
  });
};

export function session(endpoint: Endpoint, server: Server) {
  server.route(endpoint.method, endpoint.route, async (req, res) => {
    const server = req.context;
    //authorization check
    const authorization = authorize(req, res);
    if (!authorization) {
      return;
    }
    const { id, secret } = authorization;
    const response = await server.call('session-detail', { id });
    if (!response || !response.results) {
      return unauthorized(res);
    }
    const session = response.results as Session;
    if (req.method.toUpperCase() !== 'GET' 
      && secret !== session.secret
    ) {
      return unauthorized(res);
    }
    //if all of the application scopes are not any of endpoint scopes
    //then return unauthorized
    const permits = endpoint.scopes || [];
    if (!session.scopes.some(scope => permits.includes(scope))) {
      return unauthorized(res);
    }
    //we are good to call
    req.data.set(endpoint.data || {});
    req.data.set('profileId', session.profileId);
    await server.emit(endpoint.event, req, res);
  }, endpoint.priority || 0);
};

export function app(endpoint: Endpoint, server: Server) {
  server.route(endpoint.method, endpoint.route, async (req, res) => {
    const server = req.context;
    //authorization check
    const authorization = authorize(req, res);
    if (!authorization) {
      return;
    }
    const { id, secret } = authorization;
    const response = await server.call('application-detail', { id });
    if (!response || !response.results) {
      return unauthorized(res);
    }
    const application = response.results as Application;
    if (req.method.toUpperCase() !== 'GET' 
      && secret !== application.secret
    ) {
      return unauthorized(res);
    }
    //if all of the application scopes are not any of endpoint scopes
    //then return unauthorized
    const permits = endpoint.scopes || [];
    if (!application.scopes.some(scope => permits.includes(scope))) {
      return unauthorized(res);
    }
    //we are good to call
    req.data.set(endpoint.data || {});
    await server.emit(endpoint.event, req, res);
  }, endpoint.priority || 0);
};

export function open(endpoint: Endpoint, server: Server) {
  server.route(endpoint.method, endpoint.route, async (req, res) => {
    const server = req.context;
    req.data.set(endpoint.data || {});
    await server.emit(endpoint.event, req, res);
  }, endpoint.priority || 0);
};