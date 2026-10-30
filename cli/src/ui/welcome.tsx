import { Box, Text } from 'ink';
import React from 'react';
import { MenuList } from './components/menu-list.js';
import { KeyHints, ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';

interface WelcomeScreenProps {
  message?: string | null;
  onStartSetup: () => void;
  onRestoreBackups: () => void;
  onExit: () => void;
}

export function WelcomeScreen({
  message,
  onStartSetup,
  onRestoreBackups,
  onExit,
}: WelcomeScreenProps) {
  const items = [
    { type: 'action' as const, key: 'install', label: 'Install or update configuration', value: 'install' },
    { type: 'action' as const, key: 'restore', label: 'Restore from backup', value: 'restore', tone: 'secondary' as const },
  ];

  return (
    <ScreenLayout
      title="OpenCode Setup"
      step="Setup entrypoint"
      subtitle="Prepare, switch, or restore a managed OpenCode configuration."
      context={
        <Box flexDirection="column">
          {message && (
            <Box paddingBottom={1}>
              <StatusBanner tone={message.toLowerCase().includes('failed') ? 'danger' : 'success'}>
                {message}
              </StatusBanner>
            </Box>
          )}
          <SectionCard title="Target location">
            <Text dimColor>Managed configuration will be applied globally.</Text>
            <Text color="cyan">~/.config/opencode/</Text>
          </SectionCard>
        </Box>
      }
      footer={
        <KeyHints hints={[{ keyLabel: '↑/↓', description: 'move' }, { keyLabel: 'Enter', description: 'select' }, { keyLabel: 'Esc', description: 'exit' }]} />
      }
    >
      <SectionCard title="Available actions">
        <MenuList
          items={items}
          onEscape={onExit}
          onSelect={(value) => {
            switch (value) {
              case 'install':
                onStartSetup();
                break;
              case 'restore':
                onRestoreBackups();
                break;
            }
          }}
        />
      </SectionCard>
    </ScreenLayout>
  );
}
