import * as path from 'node:path';
import type { InstallResult } from '../types/index.js';
import { getConfigDir } from '../utils/paths.js';
import { MANAGED_CONFIG_ENTRIES, REQUIRED_PROFILE_ENTRIES } from '../utils/managed-config.js';
import {
  collectProfileConfigTree,
  getConfigEntrySourcePath,
  getProfileSourceDir,
} from '../profiles/index.js';
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

async function validateProfileEntries(profileDir: string): Promise<string[]> {
  const errors: string[] = [];

  for (const entry of REQUIRED_PROFILE_ENTRIES) {
    const sourcePath = path.join(profileDir, entry);
    if (!(await pathExists(sourcePath))) {
      errors.push(`Missing required profile entry: ${sourcePath}`);
    }
  }

  return errors;
}

export async function installConfig(profileId: string): Promise<InstallResult> {
  const profileDir = await getProfileSourceDir(profileId);
  const validationErrors = await validateProfileEntries(profileDir);

  if (validationErrors.length > 0) {
    return {
      status: 'failed',
      success: false,
      filesInstalled: 0,
      profileId,
      errors: validationErrors,
    };
  }

  const profileTree = await collectProfileConfigTree(profileDir);
  if (profileTree.errors.length > 0) {
    return {
      status: 'failed',
      success: false,
      filesInstalled: 0,
      profileId,
      errors: profileTree.errors,
    };
  }

  const transaction = await createPreparedTransaction(CONFIG_DIR);

  try {
    let copied = 0;

    for (const entry of MANAGED_CONFIG_ENTRIES) {
      const srcPath = getConfigEntrySourcePath(profileDir, entry);
      if (!(await pathExists(srcPath))) {
        continue;
      }

      copied += await copyManagedPath(srcPath, path.join(transaction.stagingRoot, entry));
    }

    const stagedTree = await collectManagedTree(transaction.stagingRoot, MANAGED_CONFIG_ENTRIES);
    const stagedErrors = [
      ...stagedTree.errors,
      ...compareManagedManifests(profileTree.manifest, stagedTree.manifest, 'Staging area'),
    ];

    if (stagedErrors.length > 0) {
      return {
        status: 'failed',
        success: false,
        filesInstalled: 0,
        profileId,
        errors: stagedErrors,
      };
    }

    try {
      await applyManagedStaging(CONFIG_DIR, transaction.stagingRoot, transaction.rollbackRoot);
    } catch (error) {
      return {
        status: 'failed',
        success: false,
        filesInstalled: 0,
        profileId,
        errors: [error instanceof Error ? error.message : 'Unknown apply error'],
        rolledBack: true,
      };
    }

    if (process.env.OPENCODE_SETUP_FAIL_AFTER_APPLY === '1') {
      await restoreManagedRollback(CONFIG_DIR, transaction.rollbackRoot);
      return {
        status: 'failed',
        success: false,
        filesInstalled: 0,
        profileId,
        errors: ['Forced failure after apply for transaction rollback testing'],
        rolledBack: true,
      };
    }

    const installedTree = await collectManagedTree(CONFIG_DIR, MANAGED_CONFIG_ENTRIES);
    const installErrors = [
      ...installedTree.errors,
      ...compareManagedManifests(profileTree.manifest, installedTree.manifest, 'Installed configuration'),
    ];

    if (installErrors.length > 0) {
      await restoreManagedRollback(CONFIG_DIR, transaction.rollbackRoot);
      return {
        status: 'failed',
        success: false,
        filesInstalled: 0,
        profileId,
        errors: installErrors,
        rolledBack: true,
      };
    }

    return {
      status: 'success',
      success: true,
      filesInstalled: copied,
      profileId,
      errors: [],
    };
  } catch (error) {
    return {
      status: 'failed',
      success: false,
      filesInstalled: 0,
      profileId,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  } finally {
    await transaction.cleanup();
  }
}
