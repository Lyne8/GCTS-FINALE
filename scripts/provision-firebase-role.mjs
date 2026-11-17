import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const staffRoles = new Set(['admin', 'supervisor', 'collector']);

function printUsage() {
  console.log(
    'Usage: pnpm run provision:firebase-role -- --project <project-id> --uid <auth-uid> --role <admin|supervisor|collector> [--division <division-id>]...'
  );
  console.log(
    'Use --revoke instead of --role to remove the GCTS role and division scope.'
  );
}

function parseArgs(args) {
  const options = { divisions: [] };

  for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--revoke') {
      options.revoke = true;
      continue;
    }

    if (argument === '--help') {
      options.help = true;
      continue;
    }

    if (argument === '--division') {
      const divisionId = args[index + 1];
      if (!divisionId) {
        throw new Error('--division requires an ID');
      }
      options.divisions.push(divisionId);
      index += 1;
      continue;
    }

    if (['--project', '--uid', '--role'].includes(argument)) {
      const value = args[index + 1];
      if (!value) {
        throw new Error(`${argument} requires a value`);
      }
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function validateOptions(options) {
  if (!options.project || !options.uid) {
    throw new Error('Both --project and --uid are required');
  }

  if (options.revoke) {
    if (options.role || options.divisions.length > 0) {
      throw new Error('--revoke cannot be combined with --role or --division');
    }
    return;
  }

  if (!staffRoles.has(options.role)) {
    throw new Error('--role must be admin, supervisor, or collector');
  }

  if (options.role === 'supervisor' && options.divisions.length === 0) {
    throw new Error('A supervisor must have at least one --division');
  }

  if (options.role !== 'supervisor' && options.divisions.length > 0) {
    throw new Error('--division is only valid for a supervisor');
  }

  if (
    options.divisions.some(
      (divisionId) => divisionId.length > 64 || divisionId.includes('/')
    )
  ) {
    throw new Error('Division IDs must be at most 64 characters and cannot contain "/"');
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  validateOptions(options);

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: options.project,
  });
  const auth = getAuth(app);
  const user = await auth.getUser(options.uid);
  const claims = { ...(user.customClaims ?? {}) };

  delete claims.role;
  delete claims.divisionIds;

  if (!options.revoke) {
    claims.role = options.role;
    if (options.role === 'supervisor') {
      claims.divisionIds = [...new Set(options.divisions)];
    }
  }

  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    options.revoke
      ? `Removed GCTS role for ${user.uid} in ${options.project}.`
      : `Set GCTS role "${options.role}" for ${user.uid} in ${options.project}.`
  );
  console.log(
    'The user must sign in again to receive updated claims. Existing ID tokens can remain valid until they expire.'
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
