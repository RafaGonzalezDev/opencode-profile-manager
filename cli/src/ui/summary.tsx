import { Text, Box, useInput } from 'ink';
import React from 'react';
import type { BackupResult, InstallResult, OpenCodeUpdateResult, VerifyResult } from '../types/index.js';
import { getConfigDir } from '../utils/paths.js';
import {
  KeyHints,
  ScreenLayout,
  SectionCard,
} from './components/primitives.js';

interface SummaryScreenProps {
  profileName?: string | null;
  currentProfileName?: string | null;
  installResult: InstallResult;
  backupResult: BackupResult | null;
  openCodeUpdateResult?: OpenCodeUpdateResult | null;
  verifyResult: VerifyResult;
  onExit: () => void;
}

export function SummaryScreen({
  profileName,
  currentProfileName,
  installResult,
  backupResult,
  openCodeUpdateResult,
  verifyResult,
  onExit,
}: SummaryScreenProps) {
  const installIssues = installResult.errors.length > 0;
  const verificationIssues = verifyResult.errors.length > 0;
  const hasErrors = installIssues || verificationIssues;
  const configDir = getConfigDir();
  const isSuccess = installResult.status === 'success' && !hasErrors;
  const isSkipped = installResult.status === 'skipped' && !hasErrors;
  const wasRolledBack = installResult.rolledBack === true;
  const title =
    isSkipped
      ? 'Run completed without profile changes'
      : isSuccess
        ? 'Installation successful!'
        : wasRolledBack
          ? 'Installation rolled back after errors'
          : installResult.status === 'partial'
            ? 'Installation completed partially'
            : 'Installation completed with errors';
  const subtitle =
    isSkipped
      ? 'OpenCode was checked successfully and the profile installation step was skipped.'
      : isSuccess
        ? 'The managed OpenCode configuration has been installed successfully.'
        : wasRolledBack
          ? 'The installer detected a blocking issue and restored the previous managed configuration automatically.'
          : installResult.status === 'partial'
            ? 'The install finished with recoverable issues. Review warnings and errors below.'
            : 'The setup finished with errors. Review the reported issues before retrying.';

  useInput(() => {
    onExit();
  });

  const runtimeUpdateLabel =
    openCodeUpdateResult?.status === 'updated'
      ? `updated via ${openCodeUpdateResult.method}${
          openCodeUpdateResult.previousVersion || openCodeUpdateResult.currentVersion
            ? ` (${openCodeUpdateResult.previousVersion || 'unknown'} -> ${openCodeUpdateResult.currentVersion || 'unknown'})`
            : ''
        }`
      : openCodeUpdateResult?.status === 'unchanged'
        ? `command completed via ${openCodeUpdateResult.method}, but the active binary version did not change${openCodeUpdateResult.currentVersion ? ` (${openCodeUpdateResult.currentVersion})` : ''}`
      : openCodeUpdateResult?.status === 'verification-mismatch'
        ? `command completed via ${openCodeUpdateResult.method}, but the active binary is linked to ${openCodeUpdateResult.activeInstallMethod || 'another installation'}${openCodeUpdateResult.currentVersion ? ` (${openCodeUpdateResult.currentVersion})` : ''}`
      : openCodeUpdateResult?.status === 'unverified'
        ? `command completed via ${openCodeUpdateResult.method}, but the active installation could not be verified${openCodeUpdateResult.currentVersion ? ` (${openCodeUpdateResult.currentVersion})` : ''}`
      : openCodeUpdateResult?.status === 'path-warning'
        ? openCodeUpdateResult.error || 'OpenCode was updated, but the active shell PATH still points somewhere else.'
      : openCodeUpdateResult?.status === 'skipped'
        ? `skipped by user${openCodeUpdateResult.currentVersion ? ` (${openCodeUpdateResult.currentVersion})` : ''}`
        : openCodeUpdateResult?.status === 'failed'
          ? `failed via ${openCodeUpdateResult.method}${
              openCodeUpdateResult.currentVersion || openCodeUpdateResult.previousVersion
                ? ` (${openCodeUpdateResult.currentVersion || openCodeUpdateResult.previousVersion})`
                : ''
            }`
          : null;

  return (
    <ScreenLayout
      title={title}
      step="Run complete"
      subtitle={subtitle}
      footer={<KeyHints hints={[{ keyLabel: 'Any key', description: 'exit' }]} />}
    >
      <Box paddingBottom={1}>
        <SectionCard title="Details">
          <Text>Config path: <Text color="cyan">{configDir}</Text></Text>
          {openCodeUpdateResult && openCodeUpdateResult.status !== 'idle' && (
            <Text>
              Runtime update:{' '}
              <Text dimColor>{runtimeUpdateLabel}</Text>
            </Text>
          )}
          {isSkipped && (
            <Text>
              Profile install: <Text dimColor>{currentProfileName || 'current profile unchanged'}</Text>
            </Text>
          )}
          {profileName && !isSkipped && (
            <Text>
              Target profile: <Text dimColor>{profileName}</Text>
            </Text>
          )}
          {backupResult?.backupPath && (
            <Text>
              Backup path:{' '}
              <Text dimColor>
                {backupResult.backupPath}
                {backupResult.profileId ? ` (${backupResult.profileId})` : ''}
              </Text>
            </Text>
          )}
          <Text>
            Next step: <Text bold>opencode --version</Text>
          </Text>
        </SectionCard>
      </Box>

      {installIssues && (
        <Box paddingBottom={1}>
          <SectionCard title={wasRolledBack ? 'Blocking errors (rollback completed)' : 'Install errors'}>
            {installResult.errors.map((error) => (
              <Text key={error} color="red">- {error}</Text>
            ))}
          </SectionCard>
        </Box>
      )}

      {verifyResult.warnings.length > 0 && (
        <Box paddingBottom={1}>
          <SectionCard title="Warnings">
            {verifyResult.warnings.map((warning) => (
              <Text key={warning} color="yellow">- {warning}</Text>
            ))}
          </SectionCard>
        </Box>
      )}

      {verificationIssues && (
        <Box paddingBottom={1}>
          <SectionCard title="Verification errors">
            {verifyResult.errors.map((error) => (
              <Text key={error} color="red">- {error}</Text>
            ))}
          </SectionCard>
        </Box>
      )}
    </ScreenLayout>
  );
}
