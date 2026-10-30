import React from 'react';
import { Box, Text } from 'ink';
import type { BackupEntry } from '../types/index.js';
import { MenuList } from './components/menu-list.js';
import {
  KeyHints,
  ScreenLayout,
  SectionCard,
  StatusBanner,
} from './components/primitives.js';

interface RecentBackupsScreenProps {
  backups: BackupEntry[];
  selectedProfileName?: string | null;
  message?: string | null;
  onRestore: (backup: BackupEntry) => void;
  onBack: () => void;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function RecentBackupsScreen({
  backups,
  selectedProfileName,
  message,
  onRestore,
  onBack,
}: RecentBackupsScreenProps) {
  const items = [
    ...backups.map((backup) => ({
      type: 'action' as const,
      key: backup.path,
      label: `${formatTimestamp(backup.createdAt)} · ${backup.filesBackedUp} files${
        backup.profileId ? ` · ${backup.profileId}` : ''
      }`,
      value: backup.path,
    })),
  ];

  return (
    <ScreenLayout
      title="Recent backups"
      step="Recovery options"
      subtitle="Restore one of the latest managed backups if you want to revert the current OpenCode configuration."
      context={
        <Box flexDirection="column">
          {selectedProfileName && (
            <Box paddingBottom={1}>
              <StatusBanner tone="info">Selected profile: {selectedProfileName}</StatusBanner>
            </Box>
          )}
          {message && (
            <StatusBanner tone={message.toLowerCase().includes('failed') ? 'danger' : 'success'}>
              {message}
            </StatusBanner>
          )}
        </Box>
      }
      footer={<KeyHints hints={[{ keyLabel: '↑/↓', description: 'move' }, { keyLabel: 'Enter', description: 'select' }, { keyLabel: 'Esc', description: 'back' }]} />}
    >
      <Box paddingBottom={1}>
        <SectionCard title={backups.length === 0 ? 'No backups found' : 'Select a backup'}>
          {backups.length === 0 ? (
            <Text dimColor>Nothing was found in ~/.config/opencode/backups.</Text>
          ) : (
            <MenuList
              items={items}
              onEscape={onBack}
              onSelect={(value) => {
                const backup = backups.find((entry) => entry.path === value);
                if (backup) {
                  onRestore(backup);
                }
              }}
            />
          )}
        </SectionCard>
      </Box>

      {backups.length > 0 && (
        <SectionCard title="Resolved paths">
          {backups.map((backup) => (
            <Text key={backup.path} dimColor>
              {backup.name}: {backup.path}
              {backup.profileId ? ` (${backup.profileId})` : ''}
            </Text>
          ))}
        </SectionCard>
      )}

      {backups.length === 0 && <SectionCard title="Navigation"><Text dimColor>Press Esc to go back.</Text></SectionCard>}
    </ScreenLayout>
  );
}
