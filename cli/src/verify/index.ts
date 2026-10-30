import type { VerifyResult } from '../types/index.js';
import { getConfigDir } from '../utils/paths.js';
import { collectProfileConfigTree, getProfileSourceDir } from '../profiles/index.js';
import { MANAGED_CONFIG_ENTRIES } from '../utils/managed-config.js';
import { collectManagedTree, compareManagedManifests } from '../utils/managed-tree.js';

const CONFIG_DIR = getConfigDir();

export async function verifyInstallation(profileId: string): Promise<VerifyResult> {
  const profileDir = await getProfileSourceDir(profileId);
  const [profileTree, installedTree] = await Promise.all([
    collectProfileConfigTree(profileDir),
    collectManagedTree(CONFIG_DIR, MANAGED_CONFIG_ENTRIES),
  ]);

  const errors = [
    ...profileTree.errors,
    ...installedTree.errors,
    ...compareManagedManifests(
      profileTree.manifest,
      installedTree.manifest,
      'Installed configuration'
    ),
  ];

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}
