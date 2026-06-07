import { createApp } from './app.js';
import { loadEnvFile } from './config.js';
import { createDatabase } from './db.js';
import { createRepository } from './repository.js';
import { createConfiguredParser } from './llmClient.js';

loadEnvFile('.env');

const db = createDatabase('data/diet.sqlite');
const repo = createRepository(db);
const parser = createConfiguredParser(process.env, repo);
const port = Number(process.env.PORT || 3000);

createApp(repo, parser).listen(port, () => {
  console.log(`Diet tracker running at http://localhost:${port}`);
});
