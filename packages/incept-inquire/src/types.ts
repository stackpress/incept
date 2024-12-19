//stackpress
import type { UnknownNest } from '@stackpress/types/dist/types';
import type { ServerRouter } from '@stackpress/ingest/dist/Router';
import type Engine from '@stackpress/inquire/dist/Engine';
import type Create from '@stackpress/inquire/dist/builder/Create';
//local
import type { Actions } from './actions';

export type SearchParams = {
  q?: string,
  columns?: string[],
  include?: string[],
  filter?: Record<string, string|number|boolean>,
  span?: Record<string, (string|number|null|undefined)[]>,
  sort?: Record<string, any>,
  skip?: number,
  take?: number,
  total?: boolean
};

export type ClientWithDatabasePlugin<M extends UnknownNest = UnknownNest> = {
  actions: (engine: Engine) => Actions<M>,
  events: ServerRouter,
  schema: Create,
}

export type DatabaseConfig = {
  database: {
    migrations: string
  }
};
export type DatabasePlugin = Engine;