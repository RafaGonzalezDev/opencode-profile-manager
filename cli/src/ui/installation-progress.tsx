import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { ScreenLayout, SectionCard, StatusBanner } from './components/primitives.js';

interface InstallationProgressScreenProps {
  phase: string;
  messages: string[];
}

export function InstallationProgressScreen({ phase, messages }: InstallationProgressScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);
  const [spinnerVariantIndex, setSpinnerVariantIndex] = React.useState(0);
  const phases = ['Prepare', 'Backup', 'Replace', 'Verify'];
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      setSpinnerVariantIndex((prev) => (prev + 1) % 3);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [messages]);

  const spinnerColor = spinnerVariantIndex === 0 ? 'cyan' : spinnerVariantIndex === 1 ? 'blue' : 'green';
  
  return (
    <ScreenLayout
      title="Installation in progress"
      step="Applying managed configuration"
      subtitle="The installer is running the requested operation. Please keep this terminal open until the process completes."
    >
      <Box paddingTop={1} paddingBottom={1}>
        <StatusBanner tone="info">
          <Text color={spinnerColor}><Spinner type="dots" /></Text>
          <Text> {phase}</Text>
        </StatusBanner>
      </Box>

      <Box paddingBottom={1}>
        <SectionCard title="Current activity">
          <Text dimColor>{messages[currentMessageIndex]}</Text>
        </SectionCard>
      </Box>

      <SectionCard title="Execution flow">
        <Box flexDirection="column">
          {phases.map((item, index) => (
            <Text key={item} dimColor={index > 1}>
              {index <= 1 ? '>' : '-'} {item}
            </Text>
          ))}
        </Box>
      </SectionCard>
    </ScreenLayout>
  );
}
