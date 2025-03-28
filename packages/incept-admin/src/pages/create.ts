//stackpress
import type { UnknownNest } from '@stackpress/lib/dist/types';
import type { ServerRequest } from '@stackpress/ingest/dist/types';
import type Response from '@stackpress/ingest/dist/Response';
//incept
import type Model from '@stackpress/incept/dist/schema/Model';
//common
import type { AdminConfig } from '../types';

export default function AdminCreatePageFactory(model: Model) {
  return async function AdminCreatePage(req: ServerRequest, res: Response) {
    //if there is a response body or there is an error code
    if (res.body || (res.code && res.code !== 200)) {
      //let the response pass through
      return;
    }
    //get the server
    const server = req.context;
    //get the admin config
    const admin = server.config<AdminConfig['admin']>('admin') || {};
    const root = admin.root || '/admin';
    //if form submitted
    if (req.method === 'POST') {
      //emit the create event
      const response = await server.call<UnknownNest>(`${model.dash}-create`, req, res);
      //if they want json (success or fail)
      if (req.data.has('json')) return;
      //if successfully created
      if (res.code === 200) {
        //redirect
        res.redirect(
          `${root}/${model.dash}/detail/${response.results?.id}`
        );
      }
    }
  };
};