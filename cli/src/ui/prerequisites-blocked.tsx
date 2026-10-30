import React from 'react';
import { Box, Text } from 'ink';
import type { CheckResult } from '../types/index.js';
import { ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';

interface PrerequisitesBlockedScreenProps {
  failures: CheckResult[];
}

function getSuggestion(failure: CheckResult): string {
  switch (failure.name) {
    case 'Node.js':
      return 'Install Node.js 18+ and npm, then rerun the setup.';
    case 'npm':
      return 'Install npm (usually bundled with Node.js) and rerun the setup.';
    case 'Git':
      return 'Install Git and rerun the setup.';
    default:
      return 'Resolve the missing prerequisite and rerun the setup.';
  }
}

export function PrerequisitesBlockedScreen({
  failures,
}: PrerequisitesBlockedScreenProps) {
  return (
    <ScreenLayout
      title="Missing required prerequisites"
      step="Blocked before install"
      subtitle="The setup cannot proceed until the missing requirements below are resolved."
    >
      <Box paddingBottom={1}>
        <StatusBanner tone="danger">The environment is incomplete. Fix the blocking prerequisites and rerun the setup.</StatusBanner>
      </Box>

      <SectionCard title="Blocking issues">
        {failures.map((failure) => (
          <Box key={failure.name} flexDirection="column" paddingBottom={1}>
            <Text color="red">[{failure.name}] {failure.message}</Text>
            <Text dimColor>{getSuggestion(failure)}</Text>
          </Box>
        ))}
      </SectionCard>
    </ScreenLayout>
  );
}
