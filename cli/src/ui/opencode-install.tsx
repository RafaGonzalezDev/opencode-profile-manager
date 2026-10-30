import { Text, Box } from 'ink';
import React from 'react';
import type { OSType } from '../types/index.js';
import { MenuList } from './components/menu-list.js';
import { KeyHints, ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';

interface OpenCodeInstallScreenProps {
  os: OSType;
  homebrewInstalled: boolean;
  errorMessage?: string | null;
  onSelectHomebrew: () => void;
  onSelectNpm: () => void;
  onManualInstall: () => void;
  onBack: () => void;
}

export function OpenCodeInstallScreen({
  os,
  homebrewInstalled,
  errorMessage,
  onSelectHomebrew,
  onSelectNpm,
  onManualInstall,
  onBack,
}: OpenCodeInstallScreenProps) {
  const items: Array<Parameters<typeof MenuList<string>>[0]['items'][number]> = [
    { type: 'section', key: 'methods', label: 'Install methods' },
  ];

  if (os !== 'windows') {
    items.push(
      {
        type: 'action',
        key: 'homebrew',
        label: homebrewInstalled
          ? 'Homebrew (Recommended)'
          : 'Homebrew (manual install first)',
        value: 'homebrew',
        tone: homebrewInstalled ? undefined : 'secondary',
      },
      {
        type: 'action',
        key: 'npm',
        label: 'npm',
        value: 'npm',
        tone: 'secondary',
      }
    );
  } else {
    items.push({
      type: 'action',
      key: 'npm',
      label: 'npm',
      value: 'npm',
    });
  }

  items.push({
    type: 'action',
    key: 'manual',
    label: 'Show installation command',
    value: 'manual',
    tone: 'secondary',
  });

  const handleSelect = (value: string) => {
    switch (value) {
      case 'homebrew':
        onSelectHomebrew();
        break;
      case 'npm':
        onSelectNpm();
        break;
      case 'manual':
        onManualInstall();
        break;
    }
  };

  return (
    <ScreenLayout
      title="OpenCode is not installed"
      step="Bootstrap OpenCode"
      subtitle="Install the runtime first, then continue with the selected profile import."
      context={
        <Box flexDirection="column">
          {errorMessage && (
            <Box paddingBottom={1}>
              <StatusBanner tone="danger">{errorMessage}</StatusBanner>
            </Box>
          )}
          <SectionCard title="Recommendation">
            {os !== 'windows' ? (
              <Box flexDirection="column">
                <Text dimColor>
                  {homebrewInstalled
                    ? "Homebrew keeps upgrades simpler with 'brew upgrade'."
                    : 'If Homebrew is not installed yet, the CLI will show the official install command instead of running it automatically.'}
                </Text>
                <Text dimColor>npm remains the portable fallback across environments.</Text>
              </Box>
            ) : (
              <Text dimColor>npm is the supported path on Windows.</Text>
            )}
          </SectionCard>
        </Box>
      }
      footer={<KeyHints hints={[{ keyLabel: '↑/↓', description: 'move' }, { keyLabel: 'Enter', description: 'select' }, { keyLabel: 'Esc', description: 'back' }]} />}
    >
      <SectionCard title="Choose installation method">
        <MenuList<string>
          items={items}
          onSelect={handleSelect}
          onEscape={onBack}
          initialValue={os !== 'windows' ? 'homebrew' : 'npm'}
        />
      </SectionCard>
    </ScreenLayout>
  );
}
