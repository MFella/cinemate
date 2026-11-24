/**
 * Creates or updates the Secrets Manager secret read by the backend Lambda
 * (`cinemate/backend` by default). The values are copied from apps/backend/.env, so they
 * never pass through a terminal or a chat; only the key names are printed.
 *
 *   node infra/scripts/put-backend-secret.js [secret-name]
 */
const { execFileSync } = require('child_process');
const { randomBytes } = require('crypto');
const { parse } = require('dotenv');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const path = require('path');

const KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'TMDB_API_TOKEN',
  'COGNITO_CLIENT_SECRET',
];

const secretName = process.argv[2] ?? 'cinemate/backend';
const env = parse(
  readFileSync(path.join(__dirname, '../../apps/backend/.env'), 'utf8')
);

const missing = KEYS.filter(key => !env[key]);
if (missing.length) {
  console.error(`Missing in apps/backend/.env: ${missing.join(', ')}`);
  process.exit(1);
}

const secret = {
  ...Object.fromEntries(KEYS.map(key => [key, env[key]])),
  // signs the demo sessions; a new one only logs out the current demo visitors
  DEMO_TOKEN_SECRET: randomBytes(32).toString('hex'),
};

// the AWS CLI reads the value from a file: no quoting problems in cmd.exe, and the value
// stays out of the process list; the file is removed right after
const dir = mkdtempSync(path.join(tmpdir(), 'cinemate-secret-'));
const file = path.join(dir, 'secret.json');
writeFileSync(file, JSON.stringify(secret), { mode: 0o600 });

const aws = (...args) =>
  execFileSync('aws', [...args, '--region', 'eu-central-1'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

let exists = true;
try {
  aws('secretsmanager', 'describe-secret', '--secret-id', secretName);
} catch {
  exists = false;
}

try {
  aws(
    'secretsmanager',
    exists ? 'put-secret-value' : 'create-secret',
    exists ? '--secret-id' : '--name',
    secretName,
    '--secret-string',
    `file://${file.split(path.sep).join('/')}`
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(
  `${exists ? 'Updated' : 'Created'} ${secretName} with: ${Object.keys(
    secret
  ).join(', ')}`
);
