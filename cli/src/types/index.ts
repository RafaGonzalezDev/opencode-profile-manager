export type OSType = 'macos' | 'linux' | 'windows' | 'windows-wsl' | 'unknown';

export interface SystemInfo {
  os: OSType;
  nodeVersion: string | null;
  npmVersion: string | null;
  gitVersion: string | null;
  homebrewInstalled: boolean;
  shell: string;
  isElevated: boolean;
}

export interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  version?: string;
}

export interface OpenCodeStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  installMethods: OpenCodeInstallMethod[];
  activeInstallMethod: OpenCodeInstallMethod | null;
  installationAlignment: 'matched' | 'mismatch' | 'unknown';
}

export type OpenCodeInstallMethod = 'homebrew' | 'npm';

export interface ProfileDefinition {
  id: string;
  name: string;
  path: string;
  readmePath?: string;
}

export interface ConfigFile {
  path: string;
  status: 'new' | 'different' | 'identical' | 'missing';
  repoHash?: string;
  currentHash?: string;
}

export interface ConfigDetectionResult {
  configDirExists: boolean;
  profileId: string;
  files: ConfigFile[];
}

export interface ManagedFileRecord {
  relativePath: string;
  sha256: string;
  mode: number;
}

export interface BackupManifest {
  version: 2;
  backupId: string;
  createdAt: string;
  profileId: string | null;
  topLevelEntries: string[];
  files: ManagedFileRecord[];
}

export interface BackupResult {
  success: boolean;
  backupPath: string | null;
  filesBackedUp: number;
  profileId?: string | null;
  error?: string;
}

export interface BackupEntry {
  name: string;
  path: string;
  createdAt: string;
  filesBackedUp: number;
  profileId?: string | null;
}

export interface InstallResult {
  status: 'success' | 'partial' | 'failed' | 'skipped';
  success: boolean;
  filesInstalled: number;
  profileId?: string;
  errors: string[];
  rolledBack?: boolean;
}

export interface VerifyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OpenCodeUpdateResult {
  status:
    | 'idle'
    | 'skipped'
    | 'updated'
    | 'unchanged'
    | 'verification-mismatch'
    | 'unverified'
    | 'path-warning'
    | 'failed';
  method: OpenCodeInstallMethod | null;
  previousVersion?: string | null;
  currentVersion?: string | null;
  activeInstallMethod?: OpenCodeInstallMethod | null;
  error?: string;
}

export interface RuntimeInstallResult {
  success: boolean;
  error?: string;
  warning?: string;
  version?: string | null;
}
