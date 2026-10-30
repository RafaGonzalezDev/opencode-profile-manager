import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ManagedFileRecord } from '../types/index.js';

export interface ManagedTreeManifest {
  topLevelEntries: string[];
  files: ManagedFileRecord[];
}

export interface ManagedTreeResult {
  manifest: ManagedTreeManifest;
  errors: string[];
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function inspectPath(
  rootDir: string,
  currentPath: string,
  files: ManagedFileRecord[],
  errors: string[]
): Promise<void> {
  let stats: fs.Stats;

  try {
    stats = await fs.promises.lstat(currentPath);
  } catch (error) {
    errors.push(
      `Failed to inspect ${currentPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return;
  }

  if (stats.isSymbolicLink()) {
    errors.push(`Symbolic links are not supported in managed entries: ${currentPath}`);
    return;
  }

  if (stats.isDirectory()) {
    let entries: fs.Dirent[];

    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      errors.push(
        `Failed to read directory ${currentPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      await inspectPath(rootDir, path.join(currentPath, entry.name), files, errors);
    }

    return;
  }

  if (!stats.isFile()) {
    errors.push(`Unsupported managed entry type: ${currentPath}`);
    return;
  }

  files.push({
    relativePath: normalizeRelativePath(path.relative(rootDir, currentPath)),
    sha256: await hashFile(currentPath),
    mode: stats.mode & 0o777,
  });
}

export async function collectManagedTree(
  rootDir: string,
  entries: readonly string[]
): Promise<ManagedTreeResult> {
  const files: ManagedFileRecord[] = [];
  const errors: string[] = [];
  const topLevelEntries: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry);
    if (!(await pathExists(entryPath))) {
      continue;
    }

    topLevelEntries.push(entry);
    await inspectPath(rootDir, entryPath, files, errors);
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  topLevelEntries.sort((a, b) => a.localeCompare(b));

  return {
    manifest: {
      topLevelEntries,
      files,
    },
    errors,
  };
}

export function compareManagedManifests(
  expected: ManagedTreeManifest,
  actual: ManagedTreeManifest,
  label: string
): string[] {
  const errors: string[] = [];
  const expectedTopLevels = new Set(expected.topLevelEntries);
  const actualTopLevels = new Set(actual.topLevelEntries);

  for (const entry of expected.topLevelEntries) {
    if (!actualTopLevels.has(entry)) {
      errors.push(`${label} is missing managed entry: ${entry}`);
    }
  }

  for (const entry of actual.topLevelEntries) {
    if (!expectedTopLevels.has(entry)) {
      errors.push(`${label} has unexpected managed entry: ${entry}`);
    }
  }

  const expectedFiles = new Map(expected.files.map((file) => [file.relativePath, file]));
  const actualFiles = new Map(actual.files.map((file) => [file.relativePath, file]));

  for (const [relativePath, expectedFile] of expectedFiles.entries()) {
    const actualFile = actualFiles.get(relativePath);

    if (!actualFile) {
      errors.push(`${label} is missing file: ${relativePath}`);
      continue;
    }

    if (actualFile.sha256 !== expectedFile.sha256) {
      errors.push(`${label} differs from expected content: ${relativePath}`);
    }

    if (actualFile.mode !== expectedFile.mode) {
      errors.push(`${label} differs from expected permissions: ${relativePath}`);
    }
  }

  for (const relativePath of actualFiles.keys()) {
    if (!expectedFiles.has(relativePath)) {
      errors.push(`${label} has unexpected file: ${relativePath}`);
    }
  }

  return errors;
}

export async function copyManagedPath(src: string, dest: string): Promise<number> {
  const stats = await fs.promises.lstat(src);

  if (stats.isSymbolicLink()) {
    throw new Error(`Symbolic links are not supported in managed entries: ${src}`);
  }

  if (stats.isDirectory()) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    let copied = 0;

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      copied += await copyManagedPath(path.join(src, entry.name), path.join(dest, entry.name));
    }

    return copied;
  }

  if (!stats.isFile()) {
    throw new Error(`Unsupported managed entry type: ${src}`);
  }

  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.copyFile(src, dest);
  await fs.promises.chmod(dest, stats.mode & 0o777);
  return 1;
}
