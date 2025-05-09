//modules
import type { Directory } from 'ts-morph';
import path from 'node:path';
//stackress
import type { FileSystem } from '@stackpress/lib/dist/types';
import type Registry from '@stackpress/incept/dist/schema/Registry';
import { render } from '@stackpress/incept/dist/schema/helpers';

const template = `
<link rel="import" type="template" href="@stackpress/incept-admin/dist/components/head" name="html-head" />
<link rel="import" type="component" href="@stackpress/ink-ui/element/crumbs" name="element-crumbs" />
<link rel="import" type="component" href="../../components/form" name="{{lower}}-form" />
<link rel="import" type="component" href="@stackpress/incept-admin/dist/components/app" name="admin-app" />
<style>
  @ink theme;
  @ink reset;
  @ink fouc-opacity;
  @ink utilities;
</style>
<script>
  import mustache from 'mustache';
  import { env, props } from '@stackpress/ink';
  import { _ } from '@stackpress/incept-i18n';

  const { 
    config = {},
    session = { 
      id: 0, 
      token: '', 
      roles: [ 'GUEST' ], 
      permissions: [] 
    },
    request = {},
    response = {}
  } = props('document');

  const input = request.data || {};

  const {
    error,
    code = 200,
    status = 'OK',
    errors = {},
    results = {}
  } = response;

  const settings = config.admin || { 
    root: '/admin',
    name: 'Admin', 
    logo: '/images/logo-square.png',
    menu: []
  };

  const detail = mustache.render('{{template}}', results);
  const url = \`\${settings.root}/{{lower}}/update/{{ids}}\`;
  const title = _('Update {{singular}}');
  const links = {
    search: \`\${settings.root}/{{lower}}/search\`,
    detail: \`\${settings.root}/{{lower}}/detail/{{ids}}\`
  };
  const crumbs = [
    { icon: 'home', label: 'Home', href: settings.root },
    { icon: '{{icon}}', label: _('{{plural}}'), href: links.search },
    { label: detail || _('{{singular}} Detail'), href: links.detail },
    { icon: 'edit', label: title }
  ];
</script>
<html>
  <html-head />
  <body class="relative dark bg-t-0 tx-t-1 tx-arial">
    <admin-app {settings} {session} {url} {title} {code} {status} {error} {errors}>
      <header class="p-10 bg-t-1">
        <element-crumbs 
          crumbs={crumbs} 
          block 
          bold 
          white 
          icon-muted
          link-primary
          spacing={2}
        />
      </header>
      <main class="flex-grow p-10 scroll-auto h-calc-full-38">
        <div class="pb-50">
          <{{lower}}-form {input} {errors} action={url} />
        </div>
      </main>
    </admin-app>
  </body>
</html>
`.trim();

export default function generate(
  directory: Directory, 
  registry: Registry,
  fs: FileSystem
) {
  for (const model of registry.model.values()) {
    const file = path.join(
      directory.getPath(), 
      `${model.name}/admin/templates/update.ink`
    );
    if (!fs.existsSync(path.dirname(file))) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    const source = render(template, { 
      icon: model.icon || '',
      ids: model.ids.map(column => `\${results.${column.name}}`).join('/'),
      template: model.template,
      lower: model.lower, 
      singular: model.singular,
      plural: model.plural 
    });
    fs.writeFileSync(file, source);
  }
};