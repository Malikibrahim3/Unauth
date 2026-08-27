import {
  buildWorkspaceStorageManifest,
  runWorkspaceDeletionStages,
  WorkspaceDeletionRunError,
  type WorkspaceDeletionStageAdapter,
} from '@/lib/privacy/workspaceDeletion';

const MERCHANT_ID = '10000000-0000-4000-8000-000000000001';

describe('buildWorkspaceStorageManifest', () => {
  it('uses only merchant-scoped prefixes and exact legacy paths', () => {
    const manifest = buildWorkspaceStorageManifest(MERCHANT_ID, {
      evidencePackages: [{ pdf_storage_path: 'legacy-user/evidence.pdf' }],
      claimEvidence: [{ storage_path: 'legacy-user/claim.pdf' }],
      evidenceItems: [{ storage_path: 'legacy-user/item.pdf' }],
      recoveryClaimPacks: [{
        pdf_storage_path: `recovery-claim-packs/${MERCHANT_ID}/case/pack.pdf`,
        zip_storage_path: `recovery-claim-packs/${MERCHANT_ID}/case/pack.zip`,
      }],
      integrationDocuments: [],
      agreements: [],
      packConfirmations: [],
      syncJobs: [{ storage_path: 'legacy-user/import.csv' }],
    });

    expect(manifest.some((target) => target.prefix === 'legacy-user')).toBe(false);
    expect(manifest).toContainEqual(expect.objectContaining({
      bucket: 'evidence-packages',
      prefix: `recovery-claim-packs/${MERCHANT_ID}`,
    }));
    expect(manifest).toContainEqual({
      bucket: 'merchant-csv-uploads-2',
      paths: ['legacy-user/import.csv'],
    });
    expect(manifest.find((target) => target.bucket === 'evidence-packages' && target.paths)?.paths)
      .toEqual(expect.arrayContaining(['legacy-user/evidence.pdf', 'legacy-user/claim.pdf', 'legacy-user/item.pdf']));
  });
});

function receipt() {
  return {
    id: '50000000-0000-4000-8000-000000000001',
    job_reference: '20000000-0000-4000-8000-000000000001',
    merchant_reference: '10000000-0000-4000-8000-000000000001',
    actor_user_reference: '30000000-0000-4000-8000-000000000001',
    idempotency_key: 'workspace-deletion:20000000-0000-4000-8000-000000000001',
    verification: { merchant_row_absent: true },
    verified_at: '2026-08-23T00:00:00.000Z',
    meaning: 'verified',
  };
}

describe('runWorkspaceDeletionStages', () => {
  it('resumes at a failed database boundary without repeating verified storage cleanup', async () => {
    const calls: string[] = [];
    let failDatabase = true;
    let persistedStage = 'preflight';
    const adapter: WorkspaceDeletionStageAdapter = {
      start: jest.fn(async (stage) => { calls.push(`start:${stage}`); persistedStage = stage; }),
      completeStorage: jest.fn(async () => { calls.push('storage'); persistedStage = 'database_cleanup'; }),
      completeDatabase: jest.fn(async () => {
        calls.push('database');
        if (failDatabase) throw new Error('simulated database interruption');
        persistedStage = 'verification';
      }),
      verify: jest.fn(async () => { calls.push('verify'); return { merchant_row_absent: true }; }),
      finalize: jest.fn(async () => { calls.push('receipt'); return receipt(); }),
      fail: jest.fn(async (stage) => { calls.push(`failed:${stage}`); persistedStage = stage; }),
    };

    await expect(runWorkspaceDeletionStages({
      id: '20000000-0000-4000-8000-000000000001',
      status: 'pending',
      stage: 'preflight',
    }, adapter)).rejects.toBeInstanceOf(WorkspaceDeletionRunError);
    expect(persistedStage).toBe('database_cleanup');

    failDatabase = false;
    const completed = await runWorkspaceDeletionStages({
      id: '20000000-0000-4000-8000-000000000001',
      status: 'failed',
      stage: persistedStage,
    }, adapter);

    expect(completed?.id).toBe('50000000-0000-4000-8000-000000000001');
    expect(calls.filter((call) => call === 'storage')).toHaveLength(1);
    expect(calls.filter((call) => call === 'database')).toHaveLength(2);
    expect(calls.slice(-2)).toEqual(['verify', 'receipt']);
  });
});
