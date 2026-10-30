import { execa } from 'execa';
import type { SystemInfo, CheckResult, OSType } from '../types/index.js';
import { detectOS, getShell, isHomebrewAvailable } from '../utils/os.js';

export async function gatherSystemInfo(): Promise<SystemInfo> {
  const os = await detectOS();
  const shell = getShell();
  
  const [nodeVersion, npmVersion, gitVersion, homebrewInstalled] = await Promise.all([
    getNodeVersion().catch(() => null),
    getNpmVersion().catch(() => null),
    getGitVersion().catch(() => null),
    checkHomebrew().catch(() => false),
  ]);
  
  const isElevated = await checkIfElevated();
  
  return {
    os,
    nodeVersion,
    npmVersion,
    gitVersion,
    homebrewInstalled,
    shell,
    isElevated,
  };
}

async function getNodeVersion(): Promise<string> {
  const { stdout } = await execa('node', ['--version']);
  return stdout.replace('v', '');
}

async function getNpmVersion(): Promise<string> {
  const { stdout } = await execa('npm', ['--version']);
  return stdout;
}

async function getGitVersion(): Promise<string> {
  const { stdout } = await execa('git', ['--version']);
  // Extract version from "git version 2.x.x"
  return stdout.replace('git version ', '');
}

async function checkHomebrew(): Promise<boolean> {
  if (!isHomebrewAvailable()) {
    return false;
  }
  try {
    await execa('brew', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function checkIfElevated(): Promise<boolean> {
  // Check if running as root on Unix-like systems
  if (process.platform !== 'win32') {
    return process.getuid?.() === 0 || process.geteuid?.() === 0;
  }
  return false;
}

export function getSystemChecks(systemInfo: SystemInfo): CheckResult[] {
  const checks: CheckResult[] = [];
  
  // OS check
  checks.push({
    name: 'Operating System',
    status: systemInfo.os !== 'unknown' ? 'pass' : 'warn',
    message: formatOS(systemInfo.os),
    version: systemInfo.os,
  });
  
  // Node.js check
  if (systemInfo.nodeVersion) {
    const nodeStatus = compareVersions(systemInfo.nodeVersion, '18.0.0') >= 0 ? 'pass' : 'fail';
    checks.push({
      name: 'Node.js',
      status: nodeStatus,
      message: nodeStatus === 'pass' ? 'Installed' : 'Version too old',
      version: systemInfo.nodeVersion,
    });
  } else {
    checks.push({
      name: 'Node.js',
      status: 'fail',
      message: 'Not installed',
    });
  }
  
  // npm check
  if (systemInfo.npmVersion) {
    checks.push({
      name: 'npm',
      status: 'pass',
      message: 'Installed',
      version: systemInfo.npmVersion,
    });
  } else {
    checks.push({
      name: 'npm',
      status: 'fail',
      message: 'Not installed',
    });
  }
  
  // Git check
  if (systemInfo.gitVersion) {
    checks.push({
      name: 'Git',
      status: 'pass',
      message: 'Installed',
      version: systemInfo.gitVersion,
    });
  } else {
    checks.push({
      name: 'Git',
      status: 'fail',
      message: 'Not installed',
    });
  }
  
  // Homebrew check
  if (isHomebrewAvailable()) {
    checks.push({
      name: 'Homebrew',
      status: systemInfo.homebrewInstalled ? 'pass' : 'warn',
      message: systemInfo.homebrewInstalled ? 'Installed' : 'Not installed',
    });
  } else {
    checks.push({
      name: 'Homebrew',
      status: 'warn',
      message: 'Not applicable (Windows native)',
    });
  }
  
  // Shell check
  checks.push({
    name: 'Shell',
    status: 'pass',
    message: 'Detected',
    version: systemInfo.shell.split('/').pop(),
  });
  
  return checks;
}

export function getBlockingSystemFailures(systemChecks: CheckResult[]): CheckResult[] {
  const blockingChecks = new Set(['Node.js', 'npm', 'Git']);
  return systemChecks.filter(
    (check) => blockingChecks.has(check.name) && check.status === 'fail'
  );
}

function formatOS(os: OSType): string {
  switch (os) {
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'windows':
      return 'Windows (Native)';
    case 'windows-wsl':
      return 'Windows (WSL)';
    default:
      return 'Unknown';
  }
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}
