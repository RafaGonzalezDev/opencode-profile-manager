import { execa } from 'execa';
import { verifyInstalledMethod } from '../checks/opencode.js';
import type { OpenCodeInstallMethod, RuntimeInstallResult } from '../types/index.js';

const INSTALL_MESSAGES = [
  'Installing...',
  'Hold on...',
  'Casi listo...',
  'Finalizando...',
];

function getPathWarning(method: OpenCodeInstallMethod, executablePath: string): string {
  return `OpenCode was installed via ${method} at ${executablePath}, but the active shell PATH does not point to that binary yet. Reopen the shell or refresh your environment before running opencode directly.`;
}

async function verifyMethodInstallation(method: OpenCodeInstallMethod): Promise<RuntimeInstallResult> {
  const verification = await verifyInstalledMethod(method);

  if (!verification.installed || !verification.executablePath) {
    return {
      success: false,
      error: `OpenCode installation via ${method} completed, but the expected binary could not be verified.`,
    };
  }

  if (!verification.activeOnPath) {
    return {
      success: true,
      warning: getPathWarning(method, verification.executablePath),
      version: verification.version,
    };
  }

  return {
    success: true,
    version: verification.version,
  };
}

export async function installOpenCode(
  method: OpenCodeInstallMethod,
  onProgress: (message: string) => void
): Promise<RuntimeInstallResult> {
  onProgress(
    method === 'homebrew'
      ? 'Installing OpenCode with Homebrew...'
      : 'Installing OpenCode with npm...'
  );
  let messageIndex = 0;
  const interval = setInterval(() => {
    messageIndex = (messageIndex + 1) % INSTALL_MESSAGES.length;
    onProgress(INSTALL_MESSAGES[messageIndex]);
  }, 2500);

  try {
    if (method === 'homebrew') {
      await execa('brew', ['install', 'anomalyco/tap/opencode']);
    } else {
      await execa('npm', ['install', '-g', 'opencode-ai']);
    }

    return await verifyMethodInstallation(method);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    clearInterval(interval);
  }
}

export async function updateOpenCode(
  method: OpenCodeInstallMethod,
  onProgress: (message: string) => void
): Promise<RuntimeInstallResult> {
  onProgress(
    method === 'homebrew'
      ? 'Updating OpenCode with Homebrew...'
      : 'Updating OpenCode with npm...'
  );
  let messageIndex = 0;
  const interval = setInterval(() => {
    messageIndex = (messageIndex + 1) % INSTALL_MESSAGES.length;
    onProgress(INSTALL_MESSAGES[messageIndex]);
  }, 2500);

  try {
    if (method === 'homebrew') {
      await execa('brew', ['update']);
      await execa('brew', ['upgrade', 'anomalyco/tap/opencode']);
    } else {
      await execa('npm', ['install', '-g', 'opencode-ai']);
    }

    return await verifyMethodInstallation(method);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    clearInterval(interval);
  }
}

export function getOpenCodeInstallCommand(method: OpenCodeInstallMethod): string {
  if (method === 'homebrew') {
    return 'brew install anomalyco/tap/opencode';
  }
  return 'npm install -g opencode-ai';
}

export function getOpenCodeUpdateCommand(method: OpenCodeInstallMethod): string {
  if (method === 'homebrew') {
    return 'brew update && brew upgrade anomalyco/tap/opencode';
  }

  return 'npm install -g opencode-ai';
}
