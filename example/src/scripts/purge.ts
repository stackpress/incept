//stackpress
import { scripts } from '@stackpress/incept-inquire';
//common
import database from '../database';
import make from '../server';

async function purge() {
  await scripts.purge(await make(), await database());
};

purge()
  .then(() => process.exit(0))
  .catch(console.error);