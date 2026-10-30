import type { OSType } from '../types/index.js';
import * as fs from 'fs';

export async function detectOS(): Promise<OSType> {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    return 'macos';
  }
  
  if (platform === 'win32') {
    return 'windows';
  }
  
  if (platform === 'linux') {
    if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
      return 'windows-wsl';
    }

    try {
      const version = await fs.promises.readFile('/proc/version', 'utf-8');
      if (version.toLowerCase().includes('microsoft')) {
        return 'windows-wsl';
      }
    } catch {
      // Not WSL or file unavailable.
    }
    return 'linux';
  }
  
  return 'unknown';
}

export function getShell(): string {
  return process.env.SHELL || process.env.COMSPEC || 'unknown';
}

export function isHomebrewAvailable(): boolean {
  const platform = process.platform;
  return platform === 'darwin' || platform === 'linux';
}
