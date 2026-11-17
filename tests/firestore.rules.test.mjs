import { readFile } from 'node:fs/promises';
import { after, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const projectId = 'demo-gcts';
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));

    await setDoc(doc(db, 'serviceReports/central-report'), {
      residentUid: 'resident-1',
      divisionId: 'central',
      binId: 'central-bin',
      type: 'overflowing_bin',
      location: 'Central Market',
      details: 'Demo report for rules tests',
      status: 'received',
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'serviceReports/north-report'), {
      residentUid: 'resident-2',
      divisionId: 'north',
      binId: 'north-bin',
      type: 'missed_collection',
      location: 'North Division',
      details: 'Demo report for rules tests',
      status: 'under_review',
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'routes/central-assigned'), {
      code: 'GCTS-R01',
      name: 'Central Market Loop',
      divisionId: 'central',
      vehicleId: 'truck-fp-03',
      collectorUid: 'collector-1',
      status: 'assigned',
      stops: [
        { binId: 'central-bin', name: 'Central Market', status: 'pending' },
      ],
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'routes/north-unassigned'), {
      code: 'GCTS-R02',
      name: 'North Loop',
      divisionId: 'north',
      vehicleId: 'truck-fp-01',
      collectorUid: 'collector-2',
      status: 'assigned',
      stops: [
        { binId: 'north-bin', name: 'North Market', status: 'pending' },
      ],
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'bins/central-bin'), {
      name: 'Central Market',
      divisionId: 'central',
      reportingEnabled: true,
    });
    await setDoc(doc(db, 'bins/north-bin'), {
      name: 'North Division',
      divisionId: 'north',
      reportingEnabled: true,
    });
    await setDoc(doc(db, 'bins/planned-bin'), {
      name: 'Planned Bin',
      divisionId: 'north',
      installationStatus: 'planned',
      reportingEnabled: false,
    });
    await setDoc(doc(db, 'staffProfiles/collector-1'), {
      displayName: 'John Mugisha',
      email: 'john@gcts.org',
      role: 'collector',
    });
    await setDoc(doc(db, 'staffProfiles/supervisor-1'), {
      displayName: 'Sarah Supervisor',
      email: 'supervisor@gcts.org',
      role: 'supervisor',
      divisionIds: ['central'],
    });
  });
});

function residentContext(uid = 'resident-1', emailVerified = true) {
  return testEnv.authenticatedContext(uid, {
    email_verified: emailVerified,
  });
}

test('residents can read only their own reports with a verified email', async () => {
  const db = residentContext().firestore();

  await assertSucceeds(getDoc(doc(db, 'serviceReports/central-report')));
  await assertFails(getDoc(doc(db, 'serviceReports/north-report')));
  await assertSucceeds(
    getDocs(
      query(
        collection(db, 'serviceReports'),
        where('residentUid', '==', 'resident-1'),
        orderBy('createdAt', 'desc')
      )
    )
  );
  await assertFails(getDocs(collection(db, 'serviceReports')));
});

test('unverified and anonymous residents cannot read or create reports', async () => {
  const unverifiedDb = residentContext('resident-1', false).firestore();
  const anonymousDb = testEnv.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(unverifiedDb, 'serviceReports/central-report')));
  await assertFails(getDoc(doc(anonymousDb, 'serviceReports/central-report')));
  await assertFails(
    setDoc(doc(unverifiedDb, 'serviceReports/new-report'), validCreatePayload())
  );
  await assertFails(
    setDoc(doc(anonymousDb, 'serviceReports/new-report'), validCreatePayload())
  );
});

test('residents can create a valid report but cannot spoof ownership or status', async () => {
  const db = residentContext().firestore();
  const validPayload = validCreatePayload();

  await assertSucceeds(setDoc(doc(db, 'serviceReports/new-report'), validPayload));
  await assertFails(
    setDoc(doc(db, 'serviceReports/spoofed-owner'), {
      ...validCreatePayload(),
      residentUid: 'resident-2',
    })
  );
  await assertFails(
    setDoc(doc(db, 'serviceReports/spoofed-status'), {
      ...validCreatePayload(),
      status: 'resolved',
    })
  );
  await assertFails(
    setDoc(doc(db, 'serviceReports/extra-field'), {
      ...validCreatePayload(),
      reviewedBy: 'resident-1',
    })
  );
  await assertFails(
    setDoc(doc(db, 'serviceReports/forged-bin'), {
      ...validCreatePayload(),
      binId: 'missing-bin',
    })
  );
  await assertFails(
    setDoc(doc(db, 'serviceReports/forged-division'), {
      ...validCreatePayload(),
      divisionId: 'north',
    })
  );
  await assertFails(
    setDoc(doc(db, 'serviceReports/forged-location'), {
      ...validCreatePayload(),
      location: 'North Division',
    })
  );
  await assertFails(
    setDoc(doc(db, 'serviceReports/not-yet-installed-bin'), {
      ...validCreatePayload(),
      binId: 'planned-bin',
      divisionId: 'north',
      location: 'Planned Bin',
    })
  );
});

test('residents cannot modify or delete existing reports', async () => {
  const db = residentContext().firestore();
  const report = doc(db, 'serviceReports/central-report');

  await assertFails(
    updateDoc(report, {
      status: 'under_review',
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(deleteDoc(report));
});

test('authenticated residents cannot access staff routes', async () => {
  const db = residentContext().firestore();

  await assertFails(getDoc(doc(db, 'routes/central-assigned')));
});

test('verified residents can read only reportable bins', async () => {
  const db = residentContext().firestore();

  await assertSucceeds(getDoc(doc(db, 'bins/central-bin')));
  await assertFails(getDoc(doc(db, 'bins/planned-bin')));
  await assertSucceeds(
    getDocs(
      query(
        collection(db, 'bins'),
        where('reportingEnabled', '==', true)
      )
    )
  );
  await assertFails(getDocs(collection(db, 'bins')));

  const unverifiedDb = residentContext('resident-1', false).firestore();
  await assertFails(getDoc(doc(unverifiedDb, 'bins/central-bin')));
});

test('administrators and division-scoped supervisors can read reportable bins', async () => {
  const adminDb = testEnv.authenticatedContext('admin-1', {
    role: 'admin',
  }).firestore();
  const supervisorDb = testEnv.authenticatedContext('supervisor-1', {
    role: 'supervisor',
    divisionIds: ['central'],
  }).firestore();

  await assertSucceeds(getDoc(doc(adminDb, 'bins/north-bin')));
  await assertSucceeds(getDoc(doc(supervisorDb, 'bins/central-bin')));
  await assertFails(getDoc(doc(supervisorDb, 'bins/north-bin')));
  await assertFails(getDoc(doc(supervisorDb, 'bins/planned-bin')));
  await assertSucceeds(
    getDocs(
      query(
        collection(supervisorDb, 'bins'),
        where('reportingEnabled', '==', true),
        where('divisionId', 'in', ['central'])
      )
    )
  );
  await assertFails(
    getDocs(
      query(
        collection(supervisorDb, 'bins'),
        where('reportingEnabled', '==', true)
      )
    )
  );
  const collectorDb = testEnv.authenticatedContext('collector-1', {
    role: 'collector',
  }).firestore();
  await assertFails(getDoc(doc(collectorDb, 'bins/central-bin')));
});

test('staff and collectors cannot create resident reports', async () => {
  const adminDb = testEnv.authenticatedContext('admin-1', {
    role: 'admin',
  }).firestore();
  const collectorDb = testEnv.authenticatedContext('collector-1', {
    role: 'collector',
  }).firestore();

  await assertFails(
    setDoc(doc(adminDb, 'serviceReports/staff-created'), validCreatePayload())
  );
  await assertFails(
    setDoc(doc(collectorDb, 'serviceReports/collector-created'), validCreatePayload())
  );
});

test('supervisors can list and transition reports only in their assigned divisions', async () => {
  const supervisor = testEnv.authenticatedContext('supervisor-1', {
    role: 'supervisor',
    divisionIds: ['central'],
  });
  const db = supervisor.firestore();

  await assertSucceeds(getDoc(doc(db, 'serviceReports/central-report')));
  await assertFails(getDoc(doc(db, 'serviceReports/north-report')));
  await assertSucceeds(
    getDocs(
      query(
        collection(db, 'serviceReports'),
        where('divisionId', '==', 'central'),
        orderBy('createdAt', 'desc')
      )
    )
  );
  await assertFails(
    updateDoc(doc(db, 'serviceReports/central-report'), {
      status: 'resolved',
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(db, 'serviceReports/central-report'), {
      status: 'under_review',
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(db, 'serviceReports/central-report'), {
      status: 'under_review',
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(db, 'serviceReports/central-report'), {
      details: 'Changed by supervisor',
      updatedAt: serverTimestamp(),
    })
  );
});

test('administrators can read and transition reports city-wide', async () => {
  const db = testEnv.authenticatedContext('admin-1', { role: 'admin' }).firestore();

  await assertSucceeds(getDoc(doc(db, 'serviceReports/central-report')));
  await assertSucceeds(getDoc(doc(db, 'serviceReports/north-report')));
  await assertSucceeds(getDocs(collection(db, 'serviceReports')));
  await assertSucceeds(
    updateDoc(doc(db, 'serviceReports/north-report'), {
      status: 'resolved',
      updatedAt: serverTimestamp(),
    })
  );
});

test('collectors can read only routes explicitly assigned to them', async () => {
  const db = testEnv.authenticatedContext('collector-1', {
    role: 'collector',
  }).firestore();

  await assertSucceeds(getDoc(doc(db, 'routes/central-assigned')));
  await assertFails(getDoc(doc(db, 'routes/north-unassigned')));
  await assertSucceeds(
    getDocs(
      query(
        collection(db, 'routes'),
        where('collectorUid', '==', 'collector-1')
      )
    )
  );
  await assertFails(getDocs(collection(db, 'routes')));
  await assertFails(
    setDoc(doc(db, 'routes/new-route'), {
      divisionId: 'central',
      collectorUid: 'collector-1',
    })
  );
});

test('supervisors can create and assign routes in their assigned divisions', async () => {
  const supervisorDb = testEnv.authenticatedContext('supervisor-1', {
    role: 'supervisor',
    divisionIds: ['central'],
  }).firestore();
  const adminDb = testEnv.authenticatedContext('admin-1', {
    role: 'admin',
  }).firestore();

  await assertSucceeds(getDoc(doc(supervisorDb, 'routes/central-assigned')));
  await assertFails(getDoc(doc(supervisorDb, 'routes/north-unassigned')));

  // Supervisor can create route in central division
  await assertSucceeds(
    setDoc(doc(supervisorDb, 'routes/new-central-route'), {
      code: 'GCTS-R03',
      name: 'Central Expansion',
      divisionId: 'central',
      vehicleId: 'truck-fp-03',
      status: 'draft',
      stops: [{ binId: 'central-bin', name: 'Central Market', status: 'pending' }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Supervisor cannot create route outside assigned division
  await assertFails(
    setDoc(doc(supervisorDb, 'routes/new-north-route'), {
      code: 'GCTS-R04',
      name: 'North Expansion',
      divisionId: 'north',
      vehicleId: 'truck-fp-01',
      status: 'draft',
      stops: [{ binId: 'north-bin', name: 'North Market', status: 'pending' }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Supervisor can assign collector in their division
  await assertSucceeds(
    updateDoc(doc(supervisorDb, 'routes/central-assigned'), {
      collectorUid: 'collector-3',
      status: 'assigned',
      updatedAt: serverTimestamp(),
    })
  );

  // Supervisor cannot update route in north division
  await assertFails(
    updateDoc(doc(supervisorDb, 'routes/north-unassigned'), {
      collectorUid: 'collector-3',
      updatedAt: serverTimestamp(),
    })
  );

  // Admin can update routes in any division
  await assertSucceeds(
    updateDoc(doc(adminDb, 'routes/north-unassigned'), {
      collectorUid: 'collector-2',
      updatedAt: serverTimestamp(),
    })
  );
});

test('collectors can update status and stops on assigned routes but cannot reassign', async () => {
  const collectorDb = testEnv.authenticatedContext('collector-1', {
    role: 'collector',
  }).firestore();

  // Collector can transition assigned -> in_progress
  await assertSucceeds(
    updateDoc(doc(collectorDb, 'routes/central-assigned'), {
      status: 'in_progress',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Collector can record stop progress
  await assertSucceeds(
    updateDoc(doc(collectorDb, 'routes/central-assigned'), {
      stops: [
        {
          binId: 'central-bin',
          name: 'Central Market',
          status: 'collected',
          collectedAt: Timestamp.now(),
        },
      ],
      updatedAt: serverTimestamp(),
    })
  );

  // Collector cannot reassign collectorUid or divisionId
  await assertFails(
    updateDoc(doc(collectorDb, 'routes/central-assigned'), {
      collectorUid: 'collector-2',
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(collectorDb, 'routes/central-assigned'), {
      divisionId: 'north',
      updatedAt: serverTimestamp(),
    })
  );

  // Collector cannot update a route assigned to another collector
  await assertFails(
    updateDoc(doc(collectorDb, 'routes/north-unassigned'), {
      status: 'in_progress',
      updatedAt: serverTimestamp(),
    })
  );
});

test('collectors can create auditable collection events for their assigned route', async () => {
  const collectorDb = testEnv.authenticatedContext('collector-1', {
    role: 'collector',
  }).firestore();
  const eventRef = doc(collectorDb, 'collectionEvents/event-1');

  // Valid collection event
  await assertSucceeds(
    setDoc(eventRef, {
      routeId: 'central-assigned',
      binId: 'central-bin',
      divisionId: 'central',
      vehicleId: 'truck-fp-03',
      collectorUid: 'collector-1',
      outcome: 'collected',
      source: 'manual',
      collectedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
  );

  // Collector cannot spoof another collector's UID
  await assertFails(
    setDoc(doc(collectorDb, 'collectionEvents/event-spoofed'), {
      routeId: 'central-assigned',
      binId: 'central-bin',
      divisionId: 'central',
      vehicleId: 'truck-fp-03',
      collectorUid: 'collector-2',
      outcome: 'collected',
      source: 'manual',
      collectedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
  );

  // Collection events are immutable: cannot update or delete
  await assertFails(
    updateDoc(eventRef, {
      outcome: 'skipped',
    })
  );
  await assertFails(deleteDoc(eventRef));

  // Residents cannot read or create collection events
  const residentDb = residentContext().firestore();
  await assertFails(getDoc(doc(residentDb, 'collectionEvents/event-1')));
  await assertFails(
    setDoc(doc(residentDb, 'collectionEvents/resident-event'), {
      routeId: 'central-assigned',
      binId: 'central-bin',
      divisionId: 'central',
      vehicleId: 'truck-fp-03',
      collectorUid: 'resident-1',
      outcome: 'collected',
      source: 'manual',
      collectedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
  );
});

test('staff profiles are readable by staff, writable only by admin, and denied to residents', async () => {
  const adminDb = testEnv.authenticatedContext('admin-1', { role: 'admin' }).firestore();
  const supervisorDb = testEnv
    .authenticatedContext('supervisor-1', { role: 'supervisor', divisionIds: ['central'] })
    .firestore();
  const collectorDb = testEnv
    .authenticatedContext('collector-1', { role: 'collector' })
    .firestore();
  const residentDb = residentContext().firestore();
  const anonDb = testEnv.unauthenticatedContext().firestore();

  // Admin can read and write staff profiles
  await assertSucceeds(getDoc(doc(adminDb, 'staffProfiles/collector-1')));
  await assertSucceeds(
    setDoc(doc(adminDb, 'staffProfiles/collector-2'), {
      displayName: 'Sarah Atuhaire',
      email: 'sarah@gcts.org',
      role: 'collector',
    })
  );

  // Supervisor can read, but cannot write
  await assertSucceeds(getDoc(doc(supervisorDb, 'staffProfiles/collector-1')));
  await assertFails(
    setDoc(doc(supervisorDb, 'staffProfiles/collector-3'), {
      displayName: 'Unauthorized Collector',
      email: 'unauth@gcts.org',
      role: 'collector',
    })
  );

  // Collector can read, but cannot write
  await assertSucceeds(getDoc(doc(collectorDb, 'staffProfiles/collector-1')));
  await assertFails(
    setDoc(doc(collectorDb, 'staffProfiles/collector-1'), {
      displayName: 'Tampered Name',
      email: 'tampered@gcts.org',
      role: 'collector',
    })
  );

  // Residents and anonymous cannot read or write staff profiles
  await assertFails(getDoc(doc(residentDb, 'staffProfiles/collector-1')));
  await assertFails(
    setDoc(doc(residentDb, 'staffProfiles/collector-resident'), {
      displayName: 'Resident Attacker',
      email: 'attacker@gmail.com',
      role: 'collector',
    })
  );
  await assertFails(getDoc(doc(anonDb, 'staffProfiles/collector-1')));
  await assertFails(
    setDoc(doc(anonDb, 'staffProfiles/collector-anon'), {
      displayName: 'Anon Attacker',
      email: 'anon@gmail.com',
      role: 'collector',
    })
  );
});

test('staff roles assigned via staffProfiles document are recognized without custom claims', async () => {
  // Bare context without custom claims (role is in staffProfiles in Firestore)
  const collectorDb = testEnv.authenticatedContext('collector-1').firestore();
  const supervisorDb = testEnv.authenticatedContext('supervisor-1').firestore();

  // Collector can read their assigned route
  await assertSucceeds(getDoc(doc(collectorDb, 'routes/central-assigned')));
  // Collector cannot read unassigned or other collector routes
  await assertFails(getDoc(doc(collectorDb, 'routes/north-unassigned')));

  // Supervisor can read reports in their assigned division (central)
  await assertSucceeds(getDoc(doc(supervisorDb, 'serviceReports/central-report')));
  // Supervisor cannot access reports in other divisions (north)
  await assertFails(getDoc(doc(supervisorDb, 'serviceReports/north-report')));

  // Both can read staff profiles
  await assertSucceeds(getDoc(doc(collectorDb, 'staffProfiles/collector-1')));
  await assertSucceeds(getDoc(doc(supervisorDb, 'staffProfiles/supervisor-1')));
});

test('unrecognized collections remain denied by default', async () => {
  const db = testEnv.authenticatedContext('admin-1', { role: 'admin' }).firestore();

  await assertFails(getDoc(doc(db, 'users/admin-1')));
  await assertFails(getDoc(doc(db, 'bins/planned-bin')));
  await assertFails(
    setDoc(doc(db, 'bins/admin-created'), {
      name: 'Unexpected Bin',
      divisionId: 'central',
      reportingEnabled: true,
    })
  );
  await assertFails(
    setDoc(doc(db, 'users/attacker'), {
      role: 'admin',
      divisionIds: ['central', 'north'],
    })
  );
  await assertFails(getDoc(doc(db, 'serviceNotices/public-notice')));
});

function validCreatePayload() {
  return {
    residentUid: 'resident-1',
    divisionId: 'central',
    binId: 'central-bin',
    type: 'overflowing_bin',
    location: 'Central Market',
    details: 'A report submitted in a rules test',
    status: 'received',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}
