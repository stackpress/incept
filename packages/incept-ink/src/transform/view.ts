//types
import type { Directory } from 'ts-morph';
import type Registry from '@stackpress/incept/dist/config/Registry';

import fs from 'fs';
import path from 'path';
import { render } from '@stackpress/incept/dist/config/helpers';
import { objectToAttributeString } from './helpers';

const methods = [
  'code',     'color',     'country',
  'currency', 'date',      'time',
  'datetime', 'email',     'formula',
  'html',     'image',     'imagelist',
  'json',     'link',      'ul',
  'ol',       'list',      'markdown',
  'metadata', 'number',    'overflow',
  'phone',    'rating',    'space',
  'line',     'separated', 'table',
  'taglist',  'text',      'yesno',
  'none'
];

const alias: Record<string, { method: string, attributes: Record<string, unknown> }> = {
  'time': { method: 'date', attributes: { format: 'h:mm:ss a' } },
  'datetime': { method: 'date', attributes: { format: 'MMMM D, YYYY, h:mm:ss a' } }, 
  'ul': { method: 'list', attributes: {} },
  'ol': { method: 'list', attributes: { ordered: true } },
  'space': { method: 'separated', attributes: { separator: ' ' } },
  'line': { method: 'separated', attributes: { separator: 'line' } },
}

const link = `
<link rel="import" type="component" href="@stackpress/ink-ui/format/{{format}}.ink" name="format-{{format}}" />
`.trim();

const none = `
<table-row>
  <table-col>{{label}}</table-col>
  <table-col>{data.{{name}}.toString()}</table-col>
</table-row>
`.trim();

const format = `
<table-row>
  <table-col>{{label}}</table-col>
  <table-col><format-{{format}} {{attributes}} value={data.{{name}}} /></table-col>
</table-row>
`.trim();

const template = `
<link rel="import" type="component" href="@stackpress/ink-ui/layout/table.ink" name="table-layout" />
<link rel="import" type="component" href="@stackpress/ink-ui/layout/table/row.ink" name="table-row" />
<link rel="import" type="component" href="@stackpress/ink-ui/layout/table/col.ink" name="table-col" />
{{imports}}
<script>
  const { data = {} } = this.props;
</script>
<table-layout
  head="py-16 px-12 bg-t-1 b-solid b-black bt-1 bb-0 bx-0" 
  body="py-16 px-12 b-solid b-black bt-1 bb-0 bx-0" 
  odd="bg-t-0"
  even="bg-t-1"
>
  {{formats}}
</table-layout>
`.trim();

export default function generate(directory: Directory, registry: Registry) {
  for (const model of registry.model.values()) {
    const imports = new Set<string>();
    const formats: string[] = [];
    for (const column of model.views) {
      const { label } = column;
      let { method, attributes } = column.view;
      if (!methods.includes(method)) {
        continue;
      }
      if (alias[method]) {
        attributes = Object.assign({}, attributes, alias[method].attributes);
        method = alias[method].method;
      }
      if (method === 'none') {
        formats.push(render(none, { label, name: column.name }));
        continue;
      } else if (method === 'metadata') {
        attributes = { 
          ...attributes, 
          padding: 10,
          'stripe-theme': 'bg-3', 
          'background-theme': 'bg-2'
        } 
      }
      imports.add(render(link, { format: method }));
      formats.push(render(format, { 
        label, 
        name: column.name, 
        format: method, 
        attributes: objectToAttributeString(attributes) 
      }).replaceAll('  ', ' '));
    }
    const file = path.join(directory.getPath(), `${model.name}/components/view.ink`);
    if (!fs.existsSync(path.dirname(file))) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.writeFileSync(file, render(template, {
      imports: Array.from(imports.values()).join('\n'),
      formats: formats.join('\n  ')
    }));
  }
};