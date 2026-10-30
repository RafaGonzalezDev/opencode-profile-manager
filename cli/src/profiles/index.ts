import * as fs from 'fs';
import * as path from 'path';
import {
  PROFILE_CONFIG_ENTRIES,
  REQUIRED_PROFILE_ENTRIES,
  SHARED_CONFIG_FILES,
} from '../utils/managed-config.js';
import { collectManagedTree, type ManagedTreeResult } from '../utils/managed-tree.js';
import { getProfilesRootDir, getSharedConfigDir } from '../utils/paths.js';
import type { ProfileDefinition } from '../types/index.js';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isValidProfileDirectory(profilePath: string): Promise<boolean> {
  for (const entry of REQUIRED_PROFILE_ENTRIES) {
    if (!(await pathExists(path.join(profilePath, entry)))) {
      return false;
    }
  }

  return true;
}

export async function listProfiles(): Promise<ProfileDefinition[]> {
  const profilesRoot = getProfilesRootDir();
  const entries = await fs.promises.readdir(profilesRoot, { withFileTypes: true });
  const profiles: ProfileDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const profilePath = path.join(profilesRoot, entry.name);
    if (!(await isValidProfileDirectory(profilePath))) {
      continue;
    }

    profiles.push({
      id: entry.name,
      name: entry.name,
      path: profilePath,
      readmePath: path.join(profilePath, 'README.md'),
    });
  }

  profiles.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return profiles;
}

export async function getProfileSourceDir(profileId: string): Promise<string> {
  const profiles = await listProfiles();
  const profile = profiles.find((entry) => entry.id === profileId);

  if (!profile) {
    throw new Error(`Profile "${profileId}" was not found.`);
  }

  return profile.path;
}

export function getConfigEntrySourcePath(profileDir: string, entry: string): string {
  const sourceDir = (SHARED_CONFIG_FILES as readonly string[]).includes(entry)
    ? getSharedConfigDir()
    : profileDir;

  return path.join(sourceDir, entry);
}

export async function collectProfileConfigTree(
  profileDir: string
): Promise<ManagedTreeResult> {
  const [profileTree, sharedTree] = await Promise.all([
    collectManagedTree(profileDir, PROFILE_CONFIG_ENTRIES),
    collectManagedTree(getSharedConfigDir(), SHARED_CONFIG_FILES),
  ]);

  return {
    manifest: {
      topLevelEntries: [
        ...profileTree.manifest.topLevelEntries,
        ...sharedTree.manifest.topLevelEntries,
      ].sort((a, b) => a.localeCompare(b)),
      files: [...profileTree.manifest.files, ...sharedTree.manifest.files].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      ),
    },
    errors: [...profileTree.errors, ...sharedTree.errors],
  };
}
