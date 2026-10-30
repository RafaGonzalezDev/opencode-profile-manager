import React from 'react';
import { Text, Box } from 'ink';
import type { ConfigFile } from '../types/index.js';
import { MenuList } from './components/menu-list.js';
import {
  KeyHints,
  ScreenLayout,
  SectionCard,
} from './components/primitives.js';
import { uiColors } from './components/theme.js';

interface ConflictResolutionScreenProps {
  profileName: string;
  conflicts: ConfigFile[];
  backupNotice?: string | null;
  restoreNotice?: string | null;
  onContinueInstall: () => void;
  onViewDiff: () => void;
  onShowRecentBackups: () => void;
  onCancel: () => void;
}

export function ConflictResolutionScreen({
  profileName,
  conflicts,
  backupNotice,
  restoreNotice,
  onContinueInstall,
  onViewDiff,
  onShowRecentBackups,
  onCancel,
}: ConflictResolutionScreenProps) {
  const items = [
    { type: 'action' as const, key: 'continue', label: 'Continue installation (automatic backup first)', value: 'continue' },
    { type: 'action' as const, key: 'diff', label: 'View differences', value: 'diff', tone: 'secondary' as const },
    { type: 'action' as const, key: 'restore', label: 'Restore a recent backup', value: 'restore', tone: 'secondary' as const },
  ];
  
  const handleSelect = (value: string) => {
    switch (value) {
      case 'continue':
        onContinueInstall();
        break;
      case 'diff':
        onViewDiff();
        break;
      case 'restore':
        onShowRecentBackups();
        break;
    }
  };
  
  return (
    <ScreenLayout
      title="Existing configuration detected"
      step="Resolve managed config state"
      subtitle="A managed OpenCode configuration already exists. The selected profile can replace it safely after creating a backup."
      context={
        <Box flexDirection="column">
          {backupNotice && (
            <Text>
              <Text color={uiColors.accent}>{profileName}</Text>
              <Text dimColor> - {backupNotice}</Text>
            </Text>
          )}
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
        <MenuList<string> items={items} onSelect={handleSelect} onEscape={onCancel} initialValue="continue" />
      </SectionCard>
    </ScreenLayout>
  );
}
