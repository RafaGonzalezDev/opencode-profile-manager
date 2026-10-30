import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  BackupEntry,
  BackupManifest,
  BackupResult,
} from '../types/index.js';
import { getConfigDir } from '../utils/paths.js';
import { MANAGED_CONFIG_ENTRIES } from '../utils/managed-config.js';
import {
  collectManagedTree,
  compareManagedManifests,
  copyManagedPath,
  pathExists,
} from '../utils/managed-tree.js';
import {
  applyManagedStaging,
  createPreparedTransaction,
  restoreManagedRollback,
} from '../utils/managed-transaction.js';

const CONFIG_DIR = getConfigDir();
const BACKUPS_DIR = path.join(CONFIG_DIR, 'backups');

function getTimestamp(): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '00';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}_${getPart('hour')}-${getPart('minute')}-${getPart('second')}`;
}

async function countFiles(rootDir: string): Promise<number> {
  let total = 0;

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else {
        total++;
      }
    }
  }

  await walk(rootDir);
  return total;
}

async function readBackupManifest(backupPath: string): Promise<BackupManifest | null> {
  try {
    const manifestPath = path.join(backupPath, 'manifest.json');
    const content = await fs.promises.readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(content) as BackupManifest;

    if (
      parsed.version === 2 &&
      Array.isArray(parsed.topLevelEntries) &&
      Array.isArray(parsed.files)
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export async function createBackup(context?: { profileId?: string | null }): Promise<BackupResult> {
  if (!(await pathExists(CONFIG_DIR))) {
    return {
      success: true,
      backupPath: null,
      filesBackedUp: 0,
      profileId: context?.profileId ?? null,
    };
  }

  const sourceTree = await collectManagedTree(CONFIG_DIR, MANAGED_CONFIG_ENTRIES);
  if (sourceTree.errors.length > 0) {
    return {
      success: false,
      backupPath: null,
      filesBackedUp: 0,
      profileId: context?.profileId ?? null,
      error: sourceTree.errors.join(' | '),
    };
  }

  if (sourceTree.manifest.topLevelEntries.length === 0) {
    return {
      success: true,
      backupPath: null,
      filesBackedUp: 0,
      profileId: context?.profileId ?? null,
    };
  }

  await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
  const backupPath = await fs.promises.mkdtemp(path.join(BACKUPS_DIR, `backup-${getTimestamp()}-`));

  try {
    let filesBackedUp = 0;

    for (const entry of sourceTree.manifest.topLevelEntries) {
      filesBackedUp += await copyManagedPath(
        path.join(CONFIG_DIR, entry),
        path.join(backupPath, entry)
      );
    }

    const backupTree = await collectManagedTree(backupPath, MANAGED_CONFIG_ENTRIES);
    const backupErrors = [
      ...backupTree.errors,
      ...compareManagedManifests(sourceTree.manifest, backupTree.manifest, 'Backup snapshot'),
    ];

    if (backupErrors.length > 0) {
      await fs.promises.rm(backupPath, { recursive: true, force: true });
      return {
        success: false,
        backupPath: null,
        filesBackedUp: 0,
        profileId: context?.profileId ?? null,
        error: backupErrors.join(' | '),
      };
    }

    const manifest: BackupManifest = {
      version: 2,
      backupId: path.basename(backupPath),
      createdAt: new Date().toISOString(),
      profileId: context?.profileId ?? null,
      topLevelEntries: backupTree.manifest.topLevelEntries,
      files: backupTree.manifest.files,
    };

    await fs.promises.writeFile(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf-8'
    );

    const writtenManifest = await readBackupManifest(backupPath);
    if (!writtenManifest || writtenManifest.version !== 2) {
      await fs.promises.rm(backupPath, { recursive: true, force: true });
      return {
        success: false,
        backupPath: null,
        filesBackedUp: 0,
        profileId: context?.profileId ?? null,
        error: 'Backup manifest validation failed after writing the snapshot.',
      };
    }

    return {
      success: true,
      backupPath,
      filesBackedUp,
      profileId: manifest.profileId,
    };
  } catch (error) {
    await fs.promises.rm(backupPath, { recursive: true, force: true });
    return {
      success: false,
      backupPath: null,
      filesBackedUp: 0,
      profileId: context?.profileId ?? null,
      error: error instanceof Error ? error.message : 'Unknown backup error',
    };
  }
}

export async function listRecentBackups(limit = 5): Promise<BackupEntry[]> {
  try {
    const entries = await fs.promises.readdir(BACKUPS_DIR, { withFileTypes: true });
    const directories = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const backupPath = path.join(BACKUPS_DIR, entry.name);
          const stats = await fs.promises.stat(backupPath);
          const manifest = await readBackupManifest(backupPath);
          const filesBackedUp = manifest
            ? manifest.files.length
            : await countFiles(backupPath);

          return {
            name: entry.name,
            path: backupPath,
            createdAt: stats.mtime.toISOString(),
            filesBackedUp,
            profileId: manifest?.profileId ?? null,
          };
        })
    );

    return directories
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function restoreBackup(
  backupPath: string
): Promise<{ success: boolean; filesRestored: number; error?: string }> {
  const resolvedBackupPath = path.resolve(backupPath);
  const resolvedBackupsDir = path.resolve(BACKUPS_DIR);

  if (!resolvedBackupPath.startsWith(resolvedBackupsDir + path.sep)) {
    return {
      success: false,
      filesRestored: 0,
      error: 'Invalid backup path.',
    };
  }

  try {
    const stats = await fs.promises.lstat(resolvedBackupPath);
    if (stats.isSymbolicLink()) {
      return {
        success: false,
        filesRestored: 0,
        error: 'Selected backup cannot be a symbolic link.',
      };
    }

    if (!stats.isDirectory()) {
      return {
        success: false,
        filesRestored: 0,
        error: 'Selected backup is not a directory.',
      };
    }
  } catch {
    return {
      success: false,
      filesRestored: 0,
      error: 'Selected backup does not exist.',
    };
  }

  const manifest = await readBackupManifest(resolvedBackupPath);
  if (!manifest) {
    return {
      success: false,
      filesRestored: 0,
      error: 'Selected backup has an invalid manifest.',
    };
  }

  const backupTree = await collectManagedTree(resolvedBackupPath, MANAGED_CONFIG_ENTRIES);
  const manifestEntries = manifest.topLevelEntries;
  const manifestErrors = compareManagedManifests(manifest, backupTree.manifest, 'Backup snapshot');

  const validationErrors = [...backupTree.errors, ...manifestErrors];
  if (validationErrors.length > 0) {
    return {
      success: false,
      filesRestored: 0,
      error: validationErrors.join(' | '),
    };
  }

  const transaction = await createPreparedTransaction(CONFIG_DIR);

  try {
    for (const entry of manifestEntries) {
      const srcPath = path.join(resolvedBackupPath, entry);
      if (!(await pathExists(srcPath))) {
        continue;
      }

      await copyManagedPath(srcPath, path.join(transaction.stagingRoot, entry));
    }

    const stagedTree = await collectManagedTree(transaction.stagingRoot, MANAGED_CONFIG_ENTRIES);
    const stagedErrors = compareManagedManifests(manifest, stagedTree.manifest, 'Restore staging area');

    if (stagedTree.errors.length > 0 || stagedErrors.length > 0) {
      return {
        success: false,
        filesRestored: 0,
        error: [...stagedTree.errors, ...stagedErrors].join(' | '),
      };
    }

    try {
      await applyManagedStaging(CONFIG_DIR, transaction.stagingRoot, transaction.rollbackRoot);
    } catch (error) {
      return {
        success: false,
        filesRestored: 0,
        error: error instanceof Error ? error.message : 'Unknown restore error',
      };
    }

    const restoredTree = await collectManagedTree(CONFIG_DIR, MANAGED_CONFIG_ENTRIES);
    const restoredErrors = compareManagedManifests(manifest, restoredTree.manifest, 'Restored configuration');

    if (restoredTree.errors.length > 0 || restoredErrors.length > 0) {
      await restoreManagedRollback(CONFIG_DIR, transaction.rollbackRoot);
      return {
        success: false,
        filesRestored: 0,
        error: [...restoredTree.errors, ...restoredErrors].join(' | '),
      };
    }

    return {
      success: true,
      filesRestored: restoredTree.manifest.files.length,
    };
  } catch (error) {
    return {
      success: false,
      filesRestored: 0,
      error: error instanceof Error ? error.message : 'Unknown restore error',
    };
  } finally {
    await transaction.cleanup();
  }
}
