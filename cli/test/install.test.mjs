import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { symlinkSync } from 'node:fs';
import path from 'node:path';

const TEST_HOME = '/tmp/opencode-profile-manager-tests';
process.env.HOME = TEST_HOME;

const [
  backupModule,
  detectModule,
  installModule,
  verifyModule,
  pathsModule,
  treeModule,
  managedConfigModule,
] = await Promise.all([
  import('../dist/backup/index.js'),
  import('../dist/detect/config.js'),
  import('../dist/install/index.js'),
  import('../dist/verify/index.js'),
  import('../dist/utils/paths.js'),
  import('../dist/utils/managed-tree.js'),
  import('../dist/utils/managed-config.js'),
]);

const { createBackup, restoreBackup } = backupModule;
const { detectConfig } = detectModule;
const { installConfig } = installModule;
const { verifyInstallation } = verifyModule;
const { getConfigDir, getProfilesRootDir, getSharedConfigDir } = pathsModule;
const { collectManagedTree, compareManagedManifests } = treeModule;
const { MANAGED_CONFIG_ENTRIES } = managedConfigModule;

const configDir = getConfigDir();
const profilesRoot = getProfilesRootDir();

async function resetConfigDir() {
  await fs.rm(configDir, { recursive: true, force: true });
  await fs.mkdir(configDir, { recursive: true });
}

async function writeManagedConfig(tag) {
  await fs.mkdir(path.join(configDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(configDir, 'skills'), { recursive: true });
  await fs.writeFile(path.join(configDir, 'AGENTS.md'), `# ${tag}\n`, 'utf8');
  await fs.writeFile(path.join(configDir, 'opencode.json'), JSON.stringify({ tag }, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(configDir, 'agents', `${tag}.md`), `agent ${tag}\n`, 'utf8');
  await fs.writeFile(path.join(configDir, 'skills', `${tag}.md`), `skill ${tag}\n`, 'utf8');
}

async function readBackupManifest(backupPath) {
  return JSON.parse(await fs.readFile(path.join(backupPath, 'manifest.json'), 'utf8'));
}

test('createBackup rejects symbolic links inside managed entries', async () => {
  await resetConfigDir();
  await writeManagedConfig('symlink-case');
  await fs.writeFile(path.join(TEST_HOME, 'secret.txt'), 'secret\n', 'utf8');
  symlinkSync(path.join(TEST_HOME, 'secret.txt'), path.join(configDir, 'skills', 'leak.txt'));

  const result = await createBackup({ profileId: 'vanilla' });

  assert.equal(result.success, false);
  assert.match(result.error || '', /Symbolic links are not supported/);
});

test('createBackup uses unique directories even inside the same second', async () => {
  await resetConfigDir();
  await writeManagedConfig('collision');

  const RealDate = globalThis.Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      super(args.length === 0 ? '2026-01-02T03:04:05.000Z' : args[0]);
    }

    static now() {
      return new RealDate('2026-01-02T03:04:05.000Z').getTime();
    }
  }

  globalThis.Date = FixedDate;
  try {
    const first = await createBackup({ profileId: 'one' });
    await fs.writeFile(path.join(configDir, 'skills', 'extra.md'), 'extra\n', 'utf8');
    const second = await createBackup({ profileId: 'two' });

    assert.equal(first.success, true);
    assert.equal(second.success, true);
    assert.notEqual(first.backupPath, second.backupPath);
  } finally {
    globalThis.Date = RealDate;
  }
});

test('detectConfig aborts on symbolic links in the managed config', async () => {
  await resetConfigDir();
  await writeManagedConfig('detect');
  await fs.writeFile(path.join(TEST_HOME, 'detect-secret.txt'), 'secret\n', 'utf8');
  symlinkSync(path.join(TEST_HOME, 'detect-secret.txt'), path.join(configDir, 'agents', 'leak.md'));

  await assert.rejects(() => detectConfig('vanilla'), /Symbolic links are not supported/);
});

test('installConfig rejects profiles that contain symbolic links', async () => {
  const profileId = 'test-symlink-profile';
  const profileDir = path.join(profilesRoot, profileId);

  await fs.rm(profileDir, { recursive: true, force: true });
  await fs.mkdir(path.join(profileDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(profileDir, 'skills'), { recursive: true });
  await fs.writeFile(path.join(profileDir, 'AGENTS.md'), '# test\n', 'utf8');
  await fs.writeFile(path.join(profileDir, 'opencode.json'), '{}\n', 'utf8');
  await fs.writeFile(path.join(profileDir, 'agents', 'base.md'), 'agent\n', 'utf8');
  await fs.writeFile(path.join(profileDir, 'outside.txt'), 'outside\n', 'utf8');
  symlinkSync(path.join(profileDir, 'outside.txt'), path.join(profileDir, 'skills', 'linked.md'));

  try {
    const result = await installConfig(profileId);
    assert.equal(result.success, false);
    assert.match((result.errors || []).join(' '), /Symbolic links are not supported/);
  } finally {
    await fs.rm(profileDir, { recursive: true, force: true });
  }
});

test('installConfig replaces the managed config transactionally and matches the profile manifest', async () => {
  await resetConfigDir();
  await writeManagedConfig('before-install');

  const result = await installConfig('vanilla');
  const verifyResult = await verifyInstallation('vanilla');

  assert.equal(result.success, true);
  assert.equal(result.rolledBack, undefined);
  assert.equal(verifyResult.valid, true);
});

test('installConfig installs the shared env example and preserves the local env', async () => {
  await resetConfigDir();
  await writeManagedConfig('env-example');

  const localEnv = 'CONTEXT7_API_KEY=local-secret\n';
  await fs.writeFile(path.join(configDir, '.env'), localEnv, 'utf8');

  const result = await installConfig('vanilla');
  const expectedExample = await fs.readFile(
    path.join(getSharedConfigDir(), '.env.example'),
    'utf8'
  );

  assert.equal(result.success, true);
  assert.equal(
    await fs.readFile(path.join(configDir, '.env.example'), 'utf8'),
    expectedExample
  );
  assert.equal(await fs.readFile(path.join(configDir, '.env'), 'utf8'), localEnv);
});

test('installConfig rolls back automatically when forced to fail after apply', async () => {
  await resetConfigDir();
  await writeManagedConfig('rollback-source');
  const beforeTree = await collectManagedTree(configDir, MANAGED_CONFIG_ENTRIES);

  process.env.OPENCODE_SETUP_FAIL_AFTER_APPLY = '1';
  try {
    const result = await installConfig('vanilla');
    const afterTree = await collectManagedTree(configDir, MANAGED_CONFIG_ENTRIES);

    assert.equal(result.success, false);
    assert.equal(result.rolledBack, true);
    assert.deepEqual(
      compareManagedManifests(beforeTree.manifest, afterTree.manifest, 'rolled back config'),
      []
    );
  } finally {
    delete process.env.OPENCODE_SETUP_FAIL_AFTER_APPLY;
  }
});

test('restoreBackup restores v2 snapshots exactly', async () => {
  await resetConfigDir();
  await writeManagedConfig('backup-source');

  const backup = await createBackup({ profileId: 'vanilla' });
  assert.equal(backup.success, true);
  assert.ok(backup.backupPath);
  const manifest = await readBackupManifest(backup.backupPath);

  await writeManagedConfig('mutated');
  const restoreResult = await restoreBackup(backup.backupPath);
  const restoredTree = await collectManagedTree(configDir, MANAGED_CONFIG_ENTRIES);

  assert.equal(restoreResult.success, true);
  assert.deepEqual(
    compareManagedManifests(
      {
        topLevelEntries: manifest.topLevelEntries,
        files: manifest.files,
      },
      restoredTree.manifest,
      'restored config'
    ),
    []
  );
});
