import { execa } from 'execa';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type {
  OpenCodeInstallMethod,
  OpenCodeStatus,
} from '../types/index.js';
import { findExecutable } from '../utils/command.js';

interface ActiveBinaryInfo {
  version: string | null;
  executablePath: string | null;
}

interface MethodResolution {
  executableCandidates: string[];
  ownershipRoots: string[];
}

export interface MethodVerificationResult {
  installed: boolean;
  executablePath: string | null;
  version: string | null;
  activeOnPath: boolean;
  activeStatus: OpenCodeStatus;
}

function getExecutableName(): string {
  return process.platform === 'win32' ? 'opencode.cmd' : 'opencode';
}

export async function detectInstalledMethods(): Promise<OpenCodeInstallMethod[]> {
  const methods = new Set<OpenCodeInstallMethod>();

  try {
    await execa('brew', ['list', '--versions', 'opencode']);
    methods.add('homebrew');
  } catch {
    // Ignore missing Homebrew-managed installs.
  }

  try {
    await execa('npm', ['list', '-g', 'opencode-ai', '--depth=0']);
    methods.add('npm');
  } catch {
    // Ignore missing npm-managed installs.
  }

  return Array.from(methods);
}

async function getHomebrewResolution(): Promise<MethodResolution> {
  try {
    const executableName = getExecutableName();
    const [{ stdout: brewPrefixStdout }, { stdout: formulaPrefixStdout }, { stdout: cellarStdout }] =
      await Promise.all([
        execa('brew', ['--prefix']),
        execa('brew', ['--prefix', 'opencode']),
        execa('brew', ['--cellar', 'opencode']),
      ]);

    const brewPrefix = brewPrefixStdout.trim();
    const formulaPrefix = formulaPrefixStdout.trim();
    const cellarPrefix = cellarStdout.trim();

    return {
      executableCandidates: [
        path.join(formulaPrefix, 'bin', executableName),
        path.join(brewPrefix, 'bin', executableName),
      ].map((entry) => path.normalize(entry)),
      ownershipRoots: [
        path.join(brewPrefix, 'bin', executableName),
        path.join(formulaPrefix, 'bin', executableName),
        cellarPrefix,
      ].map((entry) => path.normalize(entry)),
    };
  } catch {
    return { executableCandidates: [], ownershipRoots: [] };
  }
}

async function getNpmResolution(): Promise<MethodResolution> {
  try {
    const executableName = getExecutableName();
    const [{ stdout: prefixStdout }, { stdout: rootStdout }] = await Promise.all([
      execa('npm', ['prefix', '-g']),
      execa('npm', ['root', '-g']),
    ]);

    const prefix = prefixStdout.trim();
    const root = rootStdout.trim();
    const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');

    return {
      executableCandidates: [path.join(binDir, executableName)].map((entry) => path.normalize(entry)),
      ownershipRoots: [path.join(binDir, executableName), path.join(root, 'opencode-ai')].map((entry) =>
        path.normalize(entry)
      ),
    };
  } catch {
    return { executableCandidates: [], ownershipRoots: [] };
  }
}

async function getMethodResolution(method: OpenCodeInstallMethod): Promise<MethodResolution> {
  return method === 'homebrew' ? getHomebrewResolution() : getNpmResolution();
}

async function getActiveBinaryInfo(): Promise<ActiveBinaryInfo> {
  try {
    const [{ stdout }, executablePath] = await Promise.all([
      execa('opencode', ['--version']),
      findExecutable('opencode'),
    ]);

    return {
      version: stdout.trim(),
      executablePath,
    };
  } catch {
    return {
      version: null,
      executablePath: await findExecutable('opencode'),
    };
  }
}

async function resolveActiveInstallMethod(
  executablePath: string | null,
  installMethods: OpenCodeInstallMethod[]
): Promise<OpenCodeInstallMethod | null> {
  if (!executablePath || installMethods.length === 0) {
    return null;
  }

  const normalizedExecutablePath = path.normalize(executablePath);
  const realExecutablePath = await realpath(normalizedExecutablePath).catch(() => normalizedExecutablePath);

  const methodChecks = await Promise.all(
    installMethods.map(async (method) => {
      const resolution = await getMethodResolution(method);
      const roots = await Promise.all(
        resolution.ownershipRoots.map(async (root) => {
          const normalizedRoot = path.normalize(root);
          const realRoot = await realpath(normalizedRoot).catch(() => normalizedRoot);
          return { normalizedRoot, realRoot };
        })
      );

      const matches = roots.some(({ normalizedRoot, realRoot }) => {
        const exactMatch =
          normalizedExecutablePath === normalizedRoot || realExecutablePath === normalizedRoot;
        const childMatch =
          normalizedExecutablePath.startsWith(`${normalizedRoot}${path.sep}`) ||
          realExecutablePath.startsWith(`${normalizedRoot}${path.sep}`) ||
          normalizedExecutablePath.startsWith(`${realRoot}${path.sep}`) ||
          realExecutablePath.startsWith(`${realRoot}${path.sep}`);

        return exactMatch || childMatch;
      });

      return { method, matches };
    })
  );

  const matchedMethods = methodChecks.filter((entry) => entry.matches);
  return matchedMethods.length === 1 ? matchedMethods[0]?.method ?? null : null;
}

function orderInstallMethods(
  installMethods: OpenCodeInstallMethod[],
  activeInstallMethod: OpenCodeInstallMethod | null
): OpenCodeInstallMethod[] {
  if (!activeInstallMethod) {
    return installMethods;
  }

  return [activeInstallMethod, ...installMethods.filter((method) => method !== activeInstallMethod)];
}

export async function checkOpenCode(): Promise<OpenCodeStatus> {
  const [activeInfo, installMethods] = await Promise.all([
    getActiveBinaryInfo(),
    detectInstalledMethods(),
  ]);
  const activeInstallMethod = await resolveActiveInstallMethod(activeInfo.executablePath, installMethods);
  const orderedInstallMethods = orderInstallMethods(installMethods, activeInstallMethod);
  const installationAlignment =
    installMethods.length === 0
      ? 'unknown'
      : activeInfo.version && activeInstallMethod
        ? 'matched'
        : activeInfo.version
          ? 'mismatch'
          : 'unknown';

  return {
    installed: activeInfo.version !== null,
    version: activeInfo.version,
    path: activeInfo.executablePath,
    installMethods: orderedInstallMethods,
    activeInstallMethod,
    installationAlignment,
  };
}

export async function verifyInstalledMethod(
  method: OpenCodeInstallMethod
): Promise<MethodVerificationResult> {
  const [resolution, activeStatus] = await Promise.all([
    getMethodResolution(method),
    checkOpenCode(),
  ]);

  for (const candidate of resolution.executableCandidates) {
    try {
      const { stdout } = await execa(candidate, ['--version']);
      return {
        installed: true,
        executablePath: candidate,
        version: stdout.trim(),
        activeOnPath: activeStatus.activeInstallMethod === method,
        activeStatus,
      };
    } catch {
      // Try the next candidate.
    }
  }

  return {
    installed: false,
    executablePath: null,
    version: null,
    activeOnPath: false,
    activeStatus,
  };
}
