import type Column from '@stackpress/incept/dist/schema/Column';
import type Model from '@stackpress/incept/dist/schema/Model';
import Create from '@stackpress/inquire/dist/builder/Create';
import { camelize } from '@stackpress/incept/dist/schema/helpers'; 

//map from column types to sql types and helpers
export const typemap: Record<string, string> = {
  String: 'string',
  Text: 'text',
  Number: 'number',
  Integer: 'number',
  Float: 'number',
  Boolean: 'boolean',
  Date: 'date',
  Datetime: 'datetime',
  Time: 'time',
  Json: 'json',
  Object: 'json',
  Hash: 'json'
};

export default function schema(model: Model) {
  const schema = new Create(model.name);
  for (const column of model.columns.values()) {
    //schema.addField(column.name, {})...
    field(column, schema);
  }

  for (const column of model.ids) {
    schema.addPrimaryKey(column.name);
  }
  for (const column of model.uniques) {
    schema.addUniqueKey(`${column.name}_unique_idx`, column.name);
  }
  for (const column of model.indexables) {
    schema.addKey(`${column.name}_idx`, column.name);
  }

  const relations = model.relations.map(column => {
    const table = camelize(column.type);
    const foreign = column.relation?.parent.key.name as string;
    const local = column.relation?.child.key.name as string;
    return { table, foreign, local, delete: 'CASCADE', update: 'RESTRICT' };
  });
  for (const relation of relations) {
    schema.addForeignKey(`${relation.local}_idx`, relation);
  }

  return schema;
};

export function field(column: Column, schema: Create) {
  const type = typemap[column.type];
  if (!type && !column.fieldset && !column.enum) {
    return;
  }
  const comment = (
    column.attribute('comment') as [ string ] | undefined
  )?.[0];

  //array
  if (column.multiple) {
    let hasDefault = false;
    try {
      hasDefault = typeof column.default === 'string' 
        && Array.isArray(JSON.parse(column.default));
    } catch(e) {}
    return schema.addField(column.name, {
      type: 'JSON',
      default: hasDefault ? column.default: undefined,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  } else if (type === 'json' || column.fieldset) {
    let hasDefault = false;
    try {
      hasDefault = typeof column.default === 'string' 
        && !!column.default 
        && typeof JSON.parse(column.default) === 'object';
    } catch(e) {}
    return schema.addField(column.name, {
      type: 'JSON',
      default: hasDefault ? column.default: undefined,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  //char, varchar
  } else if (type === 'string') {
    const length = clen(column);
    const hasDefault = typeof column.attributes.default === 'string'
      && !column.attributes.default.startsWith('uuid(')
      && !column.attributes.default.startsWith('cuid(')
      && !column.attributes.default.startsWith('nanoid(');
    return schema.addField(column.name, {
      type: length[0] === length[1] ? 'CHAR' : 'VARCHAR',
      length: length[1],
      default: hasDefault ? column.attributes.default : undefined,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  } else if (type === 'text') {
    return schema.addField(column.name, {
      type: 'TEXT',
      default: column.attributes.default ,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined 
    });
  } else if (type === 'boolean') {
    return schema.addField(column.name, {
      type: 'BOOLEAN',
      default: column.attributes.default,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  //integer, smallint, bigint, float
  } else if (type === 'number') {
    const { minmax, integerLength, decimalLength } = numdata(column);

    if (decimalLength > 0) {
      const length = integerLength + decimalLength;
      return schema.addField(column.name, {
        type: 'FLOAT',
        length: [ length, decimalLength ],
        default: column.attributes.default,
        nullable: !column.required,
        unsigned: minmax[0] < 0,
        comment: comment ? String(comment) : undefined
      });
    } else {
      return schema.addField(column.name, {
        type: 'INTEGER',
        length: integerLength,
        default: column.attributes.default,
        nullable: !column.required,
        unsigned: minmax[0] < 0,
        comment: comment ? String(comment) : undefined
      });
    }
  } else if (type === 'date') {
    return schema.addField(column.name, {
      type: 'DATE',
      default: column.attributes.default,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  } else if (type === 'datetime') {
    return schema.addField(column.name, {
      type: 'DATETIME',
      default: column.attributes.default,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined  
    });
  } else if (type === 'time') {
    return schema.addField(column.name, {
      type: 'TIME',
      default: column.attributes.default,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  //if it's an enum
  } else if (column.enum) {
    return schema.addField(column.name, {
      type: 'VARCHAR',
      length: 255,
      default: column.attributes.default,
      nullable: !column.required,
      comment: comment ? String(comment) : undefined
    });
  }
}

export function clen(column: Column) {
  //if is.ceq, is.cgt, is.clt, is.cge, is.cle
  const length: [ number, number ] = [ 0, 255 ];
  column.assertions.forEach(assertion => {
    if (assertion.method === 'ceq') {
      length[0] = assertion.args[0] as number;
      length[1] = assertion.args[0] as number;
    } else if (assertion.method === 'cgt') {
      length[0] = assertion.args[0] as number;
    } else if (assertion.method === 'clt') {
      length[1] = assertion.args[0] as number;
    } else if (assertion.method === 'cge') {
      length[0] = assertion.args[0] as number;
    } else if (assertion.method === 'cle') {
      length[1] = assertion.args[0] as number;
    }
  });
  //if length is less than 1, then 
  //it's invalid so set to 255
  if (length[1] < 1) {
    length[1] = 255;
  }
  return length;
}

export function numdata(column: Column) {
  const minmax: [ number, number ] = [ 0, 0 ];
  column.assertions.forEach(assertion => {
    if (assertion.method === 'eq') {
      minmax[0] = assertion.args[0] as number;
      minmax[1] = assertion.args[0] as number;
    } else if (assertion.method === 'gt') {
      minmax[0] = assertion.args[0] as number;
    } else if (assertion.method === 'lt') {
      minmax[1] = assertion.args[0] as number;
    } else if (assertion.method === 'ge') {
      minmax[0] = assertion.args[0] as number;
    } else if (assertion.method === 'le') {
      minmax[1] = assertion.args[0] as number;
    }
  });

  //determine the length of each min/max
  const minIntegerLength = minmax[0].toString().split('.')[0].length;
  const maxIntegerLength = minmax[1].toString().split('.')[0].length;
  const minDecimalLength = (minmax[0].toString().split('.')[1] || '').length;
  const maxDecimalLength = (minmax[1].toString().split('.')[1] || '').length;
  //check for @step(0.01)
  const step = Array.isArray(column.attributes.step) 
    ? column.attributes.step[0] as number
    : 0;
  const stepIntegerLength = step.toString().split('.')[0].length;
  const stepDecimalLength = (step.toString().split('.')[1] || '').length;
  const integerLength = Math.max(
    minIntegerLength, 
    maxIntegerLength, 
    stepIntegerLength
  );
  const decimalLength = Math.max(
    minDecimalLength, 
    maxDecimalLength, 
    stepDecimalLength
  );

  return {
    step,
    minmax,
    minIntegerLength, 
    maxIntegerLength,
    minDecimalLength,
    maxDecimalLength,
    stepIntegerLength,
    stepDecimalLength,
    integerLength,
    decimalLength
  };
}