import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const projectId = 'gcts-14674';
const bins = [
  {
    id: 'central-market',
    code: 'GCTS-C-01',
    name: 'Fort Portal Central Market',
    divisionId: 'central',
  },
  {
    id: 'mpanga-market',
    code: 'GCTS-C-02',
    name: 'Mpanga Market',
    divisionId: 'central',
  },
  {
    id: 'kabundaire-market',
    code: 'GCTS-N-01',
    name: 'Kabundaire Market',
    divisionId: 'north',
  },
  {
    id: 'buhinga-stadium',
    code: 'GCTS-N-02',
    name: 'Buhinga Stadium',
    divisionId: 'north',
  },
  {
    id: 'booma-grounds',
    code: 'GCTS-C-03',
    name: 'Booma Grounds',
    divisionId: 'central',
  },
  {
    id: 'kisenyi-taxi-park',
    code: 'GCTS-C-04',
    name: 'Kisenyi Taxi Park',
    divisionId: 'central',
  },
  {
    id: 'nyakaseke-trading-centre',
    code: 'GCTS-N-03',
    name: 'Nyakaseke Trading Centre',
    divisionId: 'north',
  },
  {
    id: 'mmu-lab',
    code: 'MMU-LAB',
    name: 'MMU Lab',
    divisionId: 'north',
  },
];

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--') {
    args.shift();
  }
  const apply = args.includes('--apply');
  const unknownArguments = args.filter((arg) => arg !== '--apply');
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown argument: ${unknownArguments.join(' ')}`);
  }

  if (!apply) {
    console.log(`Dry run for Firestore project ${projectId}. No data was written.`);
    console.log(
      JSON.stringify(
        bins.map((bin) => ({ id: bin.id, ...toSeedDocument(bin) })),
        null,
        2
      )
    );
    console.log('Use --apply to create missing documents with Firebase Admin credentials.');
    return;
  }

  const credential = applicationDefault();
  try {
    await credential.getAccessToken();
  } catch {
    throw new Error(
      'Firebase Admin credentials are unavailable. Sign in to the trusted operator environment with Application Default Credentials, then retry.'
    );
  }

  const app = initializeApp({ credential, projectId });
  const db = getFirestore(app);
  const references = bins.map((bin) => db.collection('bins').doc(bin.id));

  const result = await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(
      references.map((reference) => transaction.get(reference))
    );
    const missing = [];

    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        missing.push(index);
        return;
      }

      const expected = bins[index];
      const existing = snapshot.data();
      if (
        existing.code !== expected.code
        || existing.name !== expected.name
        || existing.divisionId !== expected.divisionId
      ) {
        throw new Error(
          `Existing bins/${expected.id} has different identity fields; no seed data was written.`
        );
      }
    });

    for (const index of missing) {
      transaction.create(references[index], {
        ...toSeedDocument(bins[index]),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { created: missing.length, unchanged: bins.length - missing.length };
  });

  console.log(
    `Seeded ${result.created} planned bin records in ${projectId}; ${result.unchanged} matching records were left unchanged.`
  );
  console.log('No simulated readings were written; planned bins are not reportable.');
}

function toSeedDocument({ code, name, divisionId }) {
  return {
    code,
    name,
    divisionId,
    installationStatus: 'planned',
    reportingEnabled: true,
    recordSource: 'owner-confirmed-preview-location-list',
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
