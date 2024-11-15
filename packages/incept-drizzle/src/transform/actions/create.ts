//types
import type { SourceFile } from 'ts-morph';
import type Model from '@stackpress/incept/dist/config/Model';
import type { Config } from '../types';
//helpers
import { formatCode } from '@stackpress/incept/dist/config/helpers';

//map from column types to sql types and helpers
export const helpers: Record<string, string> = {
  String: 'toSqlString',
  Text: 'toSqlString',
  Number: 'toSqlFloat',
  Integer: 'toSqlInteger',
  Float: 'toSqlFloat',
  Boolean: 'toSqlBoolean',
  Date: 'toSqlDate',
  Time: 'toSqlDate',
  Datetime: 'toSqlDate',
  Json: 'toSqlString',
  Object: 'toSqlString',
  Hash: 'toSqlString'
};

export function body(model: Model, config: Config) {
  const engine = config.engine.type === 'env' 
    ? process.env[config.engine.value] 
    : config.engine.value;

  return formatCode(`
    //collect errors, if any
    const errors = assert.create(input);
    //if there were errors
    if (errors) {
      //return the errors
      return toErrorResponse(
        Exception
          .for('Invalid parameters')
          .withCode(400)
          .withErrors(errors)
      );
    }
    //action and return response
    return await tx.insert(schema.${model.camel}).values({
      ${model.assertions.map(column => {
        if (column.multiple) {
          return engine === 'sqlite' 
            ? `${column.name}: JSON.stringify(input.${column.name} || [])`
            : `${column.name}: input.${column.name} || []`;  
        } else if (['Json', 'Object', 'Hash'].includes(column.type)) {
          return engine === 'sqlite' 
            ? `${column.name}: JSON.stringify(input.${column.name} || {})`
            : `${column.name}: input.${column.name} || {}`;  
        }
        const helper = helpers[column.type];
        return helper 
          ? `${column.name}: ${helper}(input.${column.name})`
          : `${column.name}: input.${column.name}`;
      }).join(',\n')}
    })
    .returning()
    .then(results => results[0])
    .then(toResponse)
    .catch(toErrorResponse);
  `);
};

export default function generate(
  source: SourceFile, 
  model: Model,
  config: Config
) {
  //export type CreateTransaction = { insert: Function }
  source.addTypeAlias({
    isExported: true,
    name: 'CreateTransaction',
    type: 'Record<string, any> & { insert: Function }'
  });
  //export default async function create(
  //  data: ProfileInput
  //): Promise<Payload<Profile>>
  source.addFunction({
    isExported: true,
    name: 'create',
    isAsync: true,
    parameters: [
      { name: 'input', type: `${model.title}Input` },
      { name: 'tx', type: 'CreateTransaction', initializer: 'db' }
    ],
    returnType: `Promise<Payload<${model.title}>>`,
    statements: body(model, config)
  });
};