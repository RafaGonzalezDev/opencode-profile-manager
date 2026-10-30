import { Text, Box, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import type { CheckResult, OpenCodeStatus, SystemInfo } from '../types/index.js';
import {
  KeyHints,
  LabeledValue,
  ScreenLayout,
  SectionCard,
} from './components/primitives.js';
import { uiColors } from './components/theme.js';

interface SystemCheckScreenProps {
  checks: CheckResult[];
  systemInfo: SystemInfo | null;
  openCodeStatus: OpenCodeStatus | null;
  isChecking: boolean;
  onComplete: () => void;
  onExit: () => void;
}

function formatOsLabel(os?: SystemInfo['os'] | null): string {
  switch (os) {
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'windows':
      return 'Windows';
    case 'windows-wsl':
      return 'Windows (WSL)';
    default:
      return 'Unknown';
  }
}

export function SystemCheckScreen({
  checks,
  systemInfo,
  openCodeStatus,
  isChecking,
  onComplete,
  onExit,
}: SystemCheckScreenProps) {
  useInput((_input, key) => {
    if (!isChecking && key.escape) {
      onExit();
      return;
    }

    if (!isChecking && key.return) {
      onComplete();
    }
  });

  const checkTone = (status: CheckResult['status']) =>
    status === 'pass' ? 'success' : status === 'warn' ? 'warning' : 'danger';

  return (
    <ScreenLayout
      title="System check"
      step="Environment validation"
      subtitle="Verify local prerequisites before touching the managed OpenCode configuration."
      footer={
        !isChecking ? (
          <KeyHints hints={[{ keyLabel: 'Enter', description: 'continue' }, { keyLabel: 'Esc', description: 'exit' }]} />
        ) : undefined
      }
    >
      {isChecking ? (
        <Box paddingTop={1}>
          <Text color={uiColors.accent}>
            <Spinner type="dots" /> Checking system, runtime, and OpenCode availability...
          </Text>
        </Box>
      ) : null}

      {!isChecking && systemInfo && (
        <Box flexDirection="column">
          <SectionCard title="Environment and OpenCode" titleTone="accent">
            <Box flexDirection="row" justifyContent="space-between">
              <Box flexDirection="column" marginRight={4}>
                <LabeledValue label="OS" value={formatOsLabel(systemInfo.os)} />
                <LabeledValue label="Shell" value={systemInfo.shell} />
                <LabeledValue label="Node.js" value={systemInfo.nodeVersion || 'Not installed'} />
                <LabeledValue label="npm" value={systemInfo.npmVersion || 'Not installed'} />
                <LabeledValue
                  label="Git"
                  value={systemInfo.gitVersion || 'Not installed'}
                />
                <LabeledValue
                  label="Homebrew"
                  value={systemInfo.homebrewInstalled ? 'Installed' : 'Not installed'}
                  tone={systemInfo.homebrewInstalled ? 'info' : undefined}
                />
              </Box>
              <Box flexDirection="column">
                <LabeledValue
                  label="OpenCode"
                  value={openCodeStatus?.installed ? 'Installed' : 'Not installed'}
                  tone={openCodeStatus?.installed ? 'info' : 'warning'}
                />
                <LabeledValue label="Version" value={openCodeStatus?.version || 'Not available'} />
                <LabeledValue label="Path" value={openCodeStatus?.path || 'Not available'} />
              </Box>
            </Box>
          </SectionCard>

          <Box paddingTop={1}>
            <SectionCard title="Checks" titleTone="accent">
            {checks.map((check) => (
              <Box key={check.name}>
                <Text color={check.status === 'pass' ? uiColors.accent : checkTone(check.status)}>
                  {check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : 'x'}
                </Text>
                <Text> {check.name}</Text>
                <Text dimColor>{check.version ? ` · ${check.version}` : ''}</Text>
                <Text dimColor>{check.message ? ` · ${check.message}` : ''}</Text>
              </Box>
            ))}
            </SectionCard>
          </Box>
        </Box>
      )}
    </ScreenLayout>
  );
}
