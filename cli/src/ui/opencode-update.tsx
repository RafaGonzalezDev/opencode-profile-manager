import { Box, Text } from 'ink';
import React from 'react';
import type { OpenCodeInstallMethod, OpenCodeStatus } from '../types/index.js';
import { MenuList } from './components/menu-list.js';
import { KeyHints, LabeledValue, ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';

interface OpenCodeUpdateScreenProps {
  status: OpenCodeStatus;
  errorMessage?: string | null;
  onUpdate: (method: OpenCodeInstallMethod) => void;
  onContinueWithoutUpdate: () => void;
  onBack: () => void;
}

function getMethodLabel(method: OpenCodeInstallMethod): string {
  return method === 'homebrew' ? 'Update with Homebrew' : 'Update with npm';
}

function getAlignmentMessage(status: OpenCodeStatus): { tone: 'info' | 'warning'; message: string } | null {
  if (!status.installed) {
    return null;
  }

  if (status.activeInstallMethod) {
    return {
      tone: 'info',
      message: `The active opencode binary is linked to ${status.activeInstallMethod}.`,
    };
  }

  if (status.installationAlignment === 'mismatch') {
    return {
      tone: 'warning',
      message:
        'The active opencode binary could not be matched to the detected Homebrew/npm installations. Updating one method may not change the binary currently on PATH.',
    };
  }

  if (status.installMethods.length > 0) {
    return {
      tone: 'warning',
      message: 'The CLI detected a managed installation, but could not verify which method owns the active opencode binary.',
    };
  }

  return null;
}

function formatMethodList(methods: OpenCodeInstallMethod[]): string {
  if (methods.length === 0) {
    return 'Unknown';
  }

  return methods
    .map((method) => (method === 'homebrew' ? 'Homebrew' : 'npm'))
    .join(', ');
}

export function OpenCodeUpdateScreen({
  status,
  errorMessage,
  onUpdate,
  onContinueWithoutUpdate,
  onBack,
}: OpenCodeUpdateScreenProps) {
  const alignmentMessage = getAlignmentMessage(status);
  const items: Array<Parameters<typeof MenuList<string>>[0]['items'][number]> = [
    { type: 'section', key: 'methods', label: 'Update methods' },
    ...status.installMethods.map((method) => ({
      type: 'action' as const,
      key: `update-${method}`,
      label: getMethodLabel(method),
      value: method,
    })),
    { type: 'section', key: 'continue', label: 'Continue' },
    {
      type: 'action' as const,
      key: 'continue-without-update',
      label: 'Continue without updating',
      value: 'skip-update',
      tone: 'secondary' as const,
    },
  ];

  const handleSelect = (value: string) => {
    if (value === 'skip-update') {
      onContinueWithoutUpdate();
      return;
    }

    onUpdate(value as OpenCodeInstallMethod);
  };

  return (
    <ScreenLayout
      title="OpenCode is already installed"
      step="Optional runtime update"
      subtitle="Choose whether you want to update the existing OpenCode runtime before deciding about profile installation."
      context={
        <Box flexDirection="column">
          {errorMessage && (
            <Box paddingBottom={1}>
              <StatusBanner tone="danger">{errorMessage}</StatusBanner>
            </Box>
          )}
          {alignmentMessage && (
            <Box paddingBottom={1}>
              <StatusBanner tone={alignmentMessage.tone}>{alignmentMessage.message}</StatusBanner>
            </Box>
          )}
          <SectionCard title="Detected runtime">
            <LabeledValue label="Version" value={status.version || 'Unknown'} />
            <LabeledValue label="Path" value={status.path || 'Unknown'} />
            <LabeledValue label="Managed by" value={formatMethodList(status.installMethods)} />
            <LabeledValue
              label="Active method"
              value={status.activeInstallMethod || 'Unable to verify'}
              tone={status.activeInstallMethod ? 'info' : 'warning'}
            />
          </SectionCard>
          <Box paddingTop={1}>
            <Text dimColor>The CLI only updates OpenCode when you explicitly choose an update method below.</Text>
          </Box>
        </Box>
      }
      footer={
        <KeyHints
          hints={[
            { keyLabel: '↑/↓', description: 'move' },
            { keyLabel: 'Enter', description: 'select' },
            { keyLabel: 'Esc', description: 'back' },
          ]}
        />
      }
    >
      <SectionCard title="Decision">
        <MenuList<string>
          items={items}
          initialValue={status.installMethods[0] || 'skip-update'}
          onSelect={handleSelect}
          onEscape={onBack}
        />
      </SectionCard>
    </ScreenLayout>
  );
}
