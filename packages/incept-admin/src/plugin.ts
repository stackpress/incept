//stackpress
import type { CLIProps } from '@stackpress/idea-transformer/dist/types';
import type Transformer from '@stackpress/idea-transformer/dist/Transformer';
import type Server from '@stackpress/ingest/dist/Server';
//incept
import type { ClientPlugin } from '@stackpress/incept/dist';
//admin
import type { ClientWithRoutesPlugin } from './types';

type Client = ClientPlugin<ClientWithRoutesPlugin>;

/**
 * This interface is intended for the Incept library.
 */
export default function plugin(server: Server) {
  //on route, add admin routes
  server.on('route', req => {
    const server = req.context;
    try {
      //it's possible that the client isnt generated yet...
      //config, registry, model, fieldset
      const client = server.plugin<Client>('client');
      //loop through all the models
      for (const model of Object.values(client.model)) {
        //register all the admin routes
        model.admin(server);
      }
    } catch(e) {}
  });
  //generate some code in the client folder
  server.on('idea', req => {
    //get the transformer from the request
    const transformer = req.data<Transformer<CLIProps>>('transformer');
    //if no plugin object exists, create one
    if (!transformer.schema.plugin) {
      transformer.schema.plugin = {};
    }
    //add this plugin generator to the schema
    //so it can be part of the transformation
    transformer.schema.plugin['@stackpress/incept-admin/dist/transform'] = {};
  });
};