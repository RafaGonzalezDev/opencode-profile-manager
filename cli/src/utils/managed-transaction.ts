import * as fs from 'node:fs';
import * as path from 'node:path';
import { MANAGED_CONFIG_ENTRIES } from './managed-config.js';
import { pathExists } from './managed-tree.js';

async function removeManagedEntries(rootDir: string, entries: readonly string[]): Promise<void> {
  for (const entry of entries) {
    await fs.promises.rm(path.join(rootDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

export interface PreparedTransaction {
  tempRoot: string;
  stagingRoot: string;
  rollbackRoot: string;
  cleanup: () => Promise<void>;
}

export async function createPreparedTransaction(configDir: string): Promise<PreparedTransaction> {
  const parentDir = path.dirname(configDir);
  await fs.promises.mkdir(parentDir, { recursive: true });
  const tempRoot = await fs.promises.mkdtemp(path.join(parentDir, '.opencode-txn-'));
  const stagingRoot = path.join(tempRoot, 'staging');
  const rollbackRoot = path.join(tempRoot, 'rollback');

  await fs.promises.mkdir(stagingRoot, { recursive: true });
  await fs.promises.mkdir(rollbackRoot, { recursive: true });

  return {
    tempRoot,
    stagingRoot,
    rollbackRoot,
    cleanup: async () => {
      await fs.promises.rm(tempRoot, { recursive: true, force: true });
    },
  };
}

export async function restoreManagedRollback(configDir: string, rollbackRoot: string): Promise<void> {
  await removeManagedEntries(configDir, MANAGED_CONFIG_ENTRIES);

  for (const entry of MANAGED_CONFIG_ENTRIES) {
    const rollbackPath = path.join(rollbackRoot, entry);
    if (!(await pathExists(rollbackPath))) {
      continue;
    }

    await fs.promises.rename(rollbackPath, path.join(configDir, entry));
  }
}

export async function applyManagedStaging(
  configDir: string,
  stagingRoot: string,
  rollbackRoot: string
): Promise<{ movedEntries: string[] }> {
  const movedToRollback: string[] = [];
  const movedFromStaging: string[] = [];

  try {
    await fs.promises.mkdir(configDir, { recursive: true });

    for (const entry of MANAGED_CONFIG_ENTRIES) {
      const configPath = path.join(configDir, entry);
      if (!(await pathExists(configPath))) {
        continue;
      }

      const rollbackPath = path.join(rollbackRoot, entry);
      await fs.promises.mkdir(path.dirname(rollbackPath), { recursive: true });
      await fs.promises.rename(configPath, rollbackPath);
      movedToRollback.push(entry);
    }

    for (const entry of MANAGED_CONFIG_ENTRIES) {
      const stagedPath = path.join(stagingRoot, entry);
      if (!(await pathExists(stagedPath))) {
        continue;
      }

      const destinationPath = path.join(configDir, entry);
      await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.promises.rename(stagedPath, destinationPath);
      movedFromStaging.push(entry);
    }

    return {
      movedEntries: movedFromStaging,
    };
  } catch (error) {
    await removeManagedEntries(configDir, movedFromStaging);

    for (const entry of movedToRollback.reverse()) {
      const rollbackPath = path.join(rollbackRoot, entry);
      if (!(await pathExists(rollbackPath))) {
        continue;
      }

      await fs.promises.rename(rollbackPath, path.join(configDir, entry));
    }

    throw new Error(
      `Managed state apply failed after automatic rollback: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
