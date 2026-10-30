import React from 'react';
import { Box, Text, useInput } from 'ink';
import { KeyHints, ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';

interface ManualInstallScreenProps {
  command: string;
  onRetryCheck: () => void;
  onBack: () => void;
}

export function ManualInstallScreen({
  command,
  onRetryCheck,
  onBack,
}: ManualInstallScreenProps) {
  useInput((input, key) => {
    if (key.return) {
      onRetryCheck();
    } else if (key.escape) {
      onBack();
    }
  });

  return (
    <ScreenLayout
      title="Manual OpenCode installation"
      step="Manual install fallback"
      subtitle="Run the command below in a separate terminal, then return here to verify the installation."
      footer={
        <KeyHints
          hints={[
            { keyLabel: 'Enter', description: 'verify again' },
            { keyLabel: 'Esc', description: 'go back' },
          ]}
        />
      }
    >
      <Box paddingBottom={1}>
        <StatusBanner tone="warning">This path is intended for manual or restricted environments.</StatusBanner>
      </Box>
      <SectionCard title="Command">
        <Text color="cyan">{command}</Text>
      </SectionCard>
    </ScreenLayout>
  );
}
