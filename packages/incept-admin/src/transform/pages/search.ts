//modules
import type { Directory } from 'ts-morph';
import { VariableDeclarationKind } from 'ts-morph';
//stackpress
import type Registry from '@stackpress/incept/dist/schema/Registry';

export default function generate(directory: Directory, registry: Registry) {
  //loop through models
  for (const model of registry.model.values()) {
    const file = `${model.name}/admin/search.ts`;
    const source = directory.createSourceFile(file, '', { overwrite: true });
  
    // import type { ServerRequest } from '@stackpress/ingest/dist/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: '@stackpress/ingest/dist/types',
      namedImports: [ 'ServerRequest' ]
    });
    // import type Response from '@stackpress/ingest/dist/Response';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: '@stackpress/ingest/dist/Response',
      defaultImport: 'Response'
    });
    // import type { TemplatePlugin } from '@stackpress/incept-ink/dist/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: '@stackpress/incept-ink/dist/types',
      namedImports: [ 'TemplatePlugin' ]
    });
    // import type { AdminConfig } from '@stackpress/incept-admin/dist/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: '@stackpress/incept-admin/dist/types',
      namedImports: [ 'AdminConfig' ]
    });
    //const error = '@stackpress/incept-admin/dist/components/error';
    //const template = '@stackpress/.incept/${model.name}/admin/search';
    source.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: 'error',
          initializer: `'@stackpress/incept-admin/dist/components/error'`
        },
        {
          name: 'template',
          initializer: `'@stackpress/.incept/${model.name}/admin/search'`
        }
      ]
    });
    // export default async function ProfileSearch(req: ServerRequest, res: Response) {
    source.addFunction({
      name: `Admin${model.title}Search`,
      isAsync: true,
      isDefaultExport: true,
      parameters: [
        { name: 'req', type: 'ServerRequest' }, 
        { name: 'res', type: 'Response' }
      ],
      statements: `
        //if there is a response body or there is an error code
        if (res.body || (res.code && res.code !== 200)) {
          //let the response pass through
          return;
        }
        //get the server
        const server = req.context;
        //get session
        const session = await server.call('me', req);
        //get the admin config
        const admin = server.config<AdminConfig['admin']>('admin') || {};
        const root = admin.root || '/admin';
        //get the renderer
        const { render } = server.plugin<TemplatePlugin>('template');
        //extract filters from url query
        let { q, filter, span, sort, skip, take } = req.data<{
          q?: string,
          filter?: Record<string, string|number|boolean>,
          span?: Record<string, (string|number|null|undefined)[]>,
          sort?: Record<string, any>,
          skip?: number,
          take?: number
        }>();

        if (skip && !isNaN(Number(skip))) {
          skip = Number(skip);
        }

        if (take && !isNaN(Number(take))) {
          take = Number(take);
        }
        //search using the filters
        const response = await server.call(
          '${model.dash}-search',
          { q, filter, span, sort, skip, take }
        );
        //if successfully searched
        if (response.code === 200) {
          if (req.query.has('json')) {
            return res.setJSON(response);
          }
          //render the search page
          return res.setHTML(await render(template, { 
            q,
            filter, 
            span, 
            sort, 
            skip, 
            take, 
            settings: admin,
            session: session.results,
            ...response
          }));
        }
        //it did not search, render error page
        res.setHTML(await render(error, { 
          ...response, 
          settings: admin,
          session: session.results 
        }));
      `
    });
  }
};