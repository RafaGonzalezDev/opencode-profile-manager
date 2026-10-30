import React from 'react';
import { Box, Text } from 'ink';
import type { ConfigFile } from '../types/index.js';
import { MenuList } from './components/menu-list.js';
import {
  KeyHints,
  ScreenLayout,
  SectionCard,
} from './components/primitives.js';
import { uiColors } from './components/theme.js';

interface InstallConfirmationScreenProps {
  profileName: string;
  files: ConfigFile[];
  backupNotice?: string | null;
  restoreNotice?: string | null;
  onContinueInstall: () => void;
  onShowRecentBackups: () => void;
  onCancel: () => void;
}

export function InstallConfirmationScreen({
  profileName,
  files,
  backupNotice,
  restoreNotice,
  onContinueInstall,
  onShowRecentBackups,
  onCancel,
}: InstallConfirmationScreenProps) {
  const hasChanges = files.some((file) => file.status === 'different' || file.status === 'new');
  const hasExistingConfig = files.some((file) => file.status !== 'new');
  const heading = files.length === 0
    ? 'A new OpenCode configuration will be installed'
    : hasChanges
    ? hasExistingConfig
      ? 'Your OpenCode configuration will be updated'
      : 'A new OpenCode configuration will be installed'
    : 'Your OpenCode configuration is already up to date';
  const backupMessage = hasExistingConfig
    ? backupNotice || 'A safety backup will be created automatically before continuing.'
    : 'No backup is needed because no previous configuration was found.';

  const items = [
    { type: 'action' as const, key: 'continue', label: hasChanges ? 'Continue' : 'Reinstall anyway', value: 'continue' },
    { type: 'action' as const, key: 'restore', label: 'Restore a recent backup', value: 'restore', tone: 'secondary' as const },
  ];

  return (
    <ScreenLayout
      title="Ready to import configuration"
      step="Final confirmation"
      subtitle={heading}
      context={
        <Box flexDirection="column">
          <Text>
            <Text color={uiColors.accent}>{profileName}</Text>
            <Text dimColor> - {backupMessage}</Text>
          </Text>
          {restoreNotice && (
            <Text color={restoreNotice.toLowerCase().includes('failed') ? 'red' : uiColors.accent}>
              {restoreNotice}
            </Text>
          )}
        </Box>
      }
      footer={<KeyHints hints={[{ keyLabel: '↑/↓', description: 'move' }, { keyLabel: 'Enter', description: 'select' }, { keyLabel: 'Esc', description: 'cancel' }]} />}
    >
      <SectionCard title="Decision">
        <MenuList
          items={items}
          onEscape={onCancel}
          onSelect={(value) => {
            switch (value) {
              case 'continue':
                onContinueInstall();
                break;
              case 'restore':
                onShowRecentBackups();
                break;
            }
          }}
          initialValue="continue"
        />
      </SectionCard>
    </ScreenLayout>
  );
}
