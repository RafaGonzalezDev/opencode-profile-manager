import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

function getModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function getHomeDir(): string {
  return (
    process.env.HOME ||
    process.env.USERPROFILE ||
    (process.env.HOMEDRIVE && process.env.HOMEPATH
      ? path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)
      : '')
  );
}

export function getConfigDir(): string {
  return path.join(getHomeDir(), '.config', 'opencode');
}

export function getProfilesRootDir(): string {
  const moduleDir = getModuleDir();
  const candidates = [
    path.resolve(moduleDir, '..', 'assets', 'profiles'),
    path.resolve(moduleDir, '..', '..', '..', 'profiles'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Profile assets directory not found. Expected one of: ${candidates.join(', ')}`
  );
}

export function getSharedConfigDir(): string {
  const moduleDir = getModuleDir();
  const candidates = [
    path.resolve(moduleDir, '..', 'assets', 'shared'),
    path.resolve(moduleDir, '..', '..', '..'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, '.env.example'))) {
      return candidate;
    }
  }

  throw new Error(
    `Shared configuration assets directory not found. Expected one of: ${candidates.join(', ')}`
  );
}
