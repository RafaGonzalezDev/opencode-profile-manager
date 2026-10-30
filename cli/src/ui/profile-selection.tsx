import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProfileDefinition, OpenCodeUpdateResult } from '../types/index.js';
import { KeyHints, ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';
import { uiColors } from './components/theme.js';

interface ProfileSelectionScreenProps {
  profiles: ProfileDefinition[];
  selectedProfileId?: string | null;
  openCodeUpdateResult?: OpenCodeUpdateResult | null;
  onSelect: (profile: ProfileDefinition) => void;
  onSkip: () => void;
  onCancel: () => void;
}

type ProfileRow =
  | { type: 'heading'; key: string; label: string }
  | { type: 'profile'; key: string; profile: ProfileDefinition }
  | { type: 'action'; key: string; label: string; value: 'skip' };

function getUpdateFeedback(result: OpenCodeUpdateResult): string {
  if (result.status === 'updated') {
    return `OpenCode updated${result.previousVersion ? ` from ${result.previousVersion}` : ''} to ${result.currentVersion || 'an updated detected version'}.`;
  }

  if (result.status === 'unchanged') {
    return `OpenCode update command completed, but the active binary version did not change${result.currentVersion ? ` (${result.currentVersion})` : ''}.`;
  }

  if (result.status === 'verification-mismatch') {
    return `OpenCode update ran via ${result.method}, but the active binary appears to come from ${result.activeInstallMethod || 'another installation'}.`;
  }

  if (result.status === 'unverified') {
    return 'OpenCode update command completed, but the CLI could not verify that it affected the active installation.';
  }

  if (result.status === 'path-warning') {
    return result.error || 'OpenCode was updated, but the active shell PATH does not point to the verified binary yet.';
  }

  if (result.status === 'skipped') {
    return `OpenCode update skipped. Current version: ${result.currentVersion || 'unknown'}.`;
  }

  return `OpenCode update failed. Current version: ${result.currentVersion || result.previousVersion || 'unknown'}.`;
}

function getInitialSelectableIndex(rows: ProfileRow[], selectedProfileId?: string | null): number {
  if (selectedProfileId) {
    const selectedIndex = rows.findIndex(
      (row) => row.type === 'profile' && row.profile.id === selectedProfileId
    );

    if (selectedIndex >= 0) {
      return selectedIndex;
    }
  }

  return rows.findIndex((row) => row.type !== 'heading');
}

function getNextSelectableIndex(
  rows: ProfileRow[],
  currentIndex: number,
  direction: 1 | -1
): number {
  for (let offset = 1; offset <= rows.length; offset++) {
    const nextIndex = (currentIndex + offset * direction + rows.length) % rows.length;
    if (rows[nextIndex]?.type !== 'heading') {
      return nextIndex;
    }
  }

  return currentIndex;
}

export function ProfileSelectionScreen({
  profiles,
  selectedProfileId,
  openCodeUpdateResult,
  onSelect,
  onSkip,
  onCancel,
}: ProfileSelectionScreenProps) {
  const rows = useMemo<ProfileRow[]>(() => {
    const vanillaProfile = profiles.find((profile) => profile.id === 'vanilla') ?? null;
    const otherProfiles = profiles.filter((profile) => profile.id !== 'vanilla');
    const nextRows: ProfileRow[] = [];

    if (vanillaProfile) {
      nextRows.push({
        type: 'heading',
        key: 'heading-vanilla',
        label: 'Vanilla profile',
      });
      nextRows.push({
        type: 'profile',
        key: `profile-${vanillaProfile.id}`,
        profile: vanillaProfile,
      });
    }

    if (otherProfiles.length > 0) {
      nextRows.push({
        type: 'heading',
        key: 'heading-other',
        label: 'Other profiles',
      });

      for (const profile of otherProfiles) {
        nextRows.push({
          type: 'profile',
          key: `profile-${profile.id}`,
          profile,
        });
      }
    }

    nextRows.push({
      type: 'heading',
      key: 'heading-actions',
      label: 'Other actions',
    });
    nextRows.push({
      type: 'action',
      key: 'action-skip',
      label: 'Keep current profile',
      value: 'skip',
    });

    return nextRows;
  }, [profiles]);

  const [selectedIndex, setSelectedIndex] = useState(() =>
    getInitialSelectableIndex(rows, selectedProfileId)
  );

  useEffect(() => {
    setSelectedIndex(getInitialSelectableIndex(rows, selectedProfileId));
  }, [rows, selectedProfileId]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (input === 'k' || key.upArrow) {
      setSelectedIndex((currentIndex) => getNextSelectableIndex(rows, currentIndex, -1));
      return;
    }

    if (input === 'j' || key.downArrow) {
      setSelectedIndex((currentIndex) => getNextSelectableIndex(rows, currentIndex, 1));
      return;
    }

    if (!key.return) {
      return;
    }

    const selectedRow = rows[selectedIndex];
    if (!selectedRow) {
      return;
    }

    if (selectedRow.type === 'profile') {
      onSelect(selectedRow.profile);
      return;
    }

    if (selectedRow.type === 'action' && selectedRow.value === 'skip') {
      onSkip();
    }
  });

  return (
    <ScreenLayout
      title="Choose a profile"
      step="Profile discovery"
      subtitle="Select which managed OpenCode profile should be installed globally, or skip this step."
      context={
        <Box flexDirection="column">
          {openCodeUpdateResult && openCodeUpdateResult.status !== 'idle' && (
            <Box paddingBottom={1}>
              <StatusBanner
                tone={
                  openCodeUpdateResult.status === 'updated'
                    ? 'success'
                    : openCodeUpdateResult.status === 'failed' ||
                        openCodeUpdateResult.status === 'verification-mismatch'
                      ? 'danger'
                      : openCodeUpdateResult.status === 'unchanged' ||
                          openCodeUpdateResult.status === 'unverified' ||
                          openCodeUpdateResult.status === 'path-warning'
                        ? 'warning'
                        : 'info'
                }
              >
                {getUpdateFeedback(openCodeUpdateResult)}
              </StatusBanner>
            </Box>
          )}
          <Text dimColor>You can finish after updating OpenCode without replacing the managed entries in ~/.config/opencode/.</Text>
        </Box>
      }
      footer={<KeyHints hints={[{ keyLabel: '↑/↓', description: 'move' }, { keyLabel: 'Enter', description: 'select' }, { keyLabel: 'Esc', description: 'cancel' }]} />}
    >
      <SectionCard title="Available profiles">
        <Box flexDirection="column">
          {rows.map((row, index) => {
            if (row.type === 'heading') {
              return (
                <Box key={row.key} marginTop={row.key === 'heading-vanilla' ? 0 : 1}>
                  <Text dimColor>{row.label}</Text>
                </Box>
              );
            }

            const isSelected = index === selectedIndex;
            if (row.type === 'action') {
              return (
                <Box key={row.key}>
                  <Box marginRight={1}>
                    <Text color={isSelected ? uiColors.selected : undefined}>{isSelected ? '>' : ' '}</Text>
                  </Box>
                  <Text color={isSelected ? uiColors.accent : undefined} dimColor={!isSelected}>
                    {row.label}
                  </Text>
                </Box>
              );
            }

            const displayLabel = row.profile.id;

            return (
              <Box key={row.key}>
                <Box marginRight={1}>
                  <Text color={isSelected ? uiColors.selected : undefined}>{isSelected ? '>' : ' '}</Text>
                </Box>
                <Text color={isSelected ? uiColors.accent : undefined} dimColor={!isSelected}>
                  {displayLabel}
                </Text>
              </Box>
            );
          })}
        </Box>
      </SectionCard>
    </ScreenLayout>
  );
}
