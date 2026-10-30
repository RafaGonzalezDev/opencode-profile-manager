import React from 'react';
import { Box, Text } from 'ink';
import { uiColors, uiGlyphs } from './theme.js';

type BannerTone = 'info' | 'success' | 'warning' | 'danger';

function renderInkSafeNode(
  node: React.ReactNode,
  key?: React.Key,
  color?: string
): React.ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return <Text key={key} color={color}>{node}</Text>;
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => renderInkSafeNode(child, `${key ?? 'node'}-${index}`, color));
  }

  return node;
}

interface ScreenLayoutProps {
  title: string;
  subtitle?: string;
  step?: string;
  context?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function ScreenLayout({
  title,
  subtitle,
  step,
  context,
  footer,
  children,
}: ScreenLayoutProps) {
  return (
    <Box flexDirection="column" padding={1}>
      {step && (
        <Box paddingBottom={1}>
          <StepHeader label={step} />
        </Box>
      )}

      <Box paddingBottom={1}>
        <Text bold color={uiColors.accent}>{title}</Text>
      </Box>

      {subtitle && (
        <Box paddingBottom={1}>
          <Text>{subtitle}</Text>
        </Box>
      )}

      {context && (
        <Box paddingBottom={1}>
          {context}
        </Box>
      )}

      <Box flexDirection="column">{children}</Box>

      {footer && (
        <Box paddingTop={1}>
          {footer}
        </Box>
      )}
    </Box>
  );
}

export function StepHeader({ label }: { label: string }) {
  return (
    <Box>
      <Text dimColor>{uiGlyphs.corner} </Text>
      <Text dimColor>{label}</Text>
    </Box>
  );
}

export function SectionCard({
  title,
  titleTone,
  children,
}: {
  title?: string;
  titleTone?: 'default' | 'accent';
  children: React.ReactNode;
}) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={uiColors.muted} paddingX={1} paddingY={0}>
      {title && (
        <Box paddingBottom={0}>
          <Text bold color={titleTone === 'accent' ? uiColors.accent : undefined}>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}

export function StatusBanner({
  tone,
  children,
}: {
  tone: BannerTone;
  children: React.ReactNode;
}) {
  const color =
    tone === 'success'
      ? uiColors.success
      : tone === 'warning'
        ? uiColors.warning
        : tone === 'danger'
          ? uiColors.danger
          : uiColors.accent;

  return (
    <Box>
      <Box>{React.Children.toArray(children).map((child, index) => renderInkSafeNode(child, index, color))}</Box>
    </Box>
  );
}

export function LabeledValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: BannerTone;
}) {
  const color =
    tone === 'info'
      ? uiColors.accent
      : tone === 'success'
      ? uiColors.success
      : tone === 'warning'
        ? uiColors.warning
        : tone === 'danger'
          ? uiColors.danger
          : undefined;

  return (
    <Box>
      <Box width={14}>
        <Text dimColor>{label}</Text>
      </Box>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

export function KeyHints({
  hints,
}: {
  hints: Array<{ keyLabel: string; description: string }>;
}) {
  return (
    <Box flexWrap="wrap">
      {hints.map((hint, index) => (
        <Box key={`${hint.keyLabel}-${hint.description}`} marginRight={index === hints.length - 1 ? 0 : 2}>
          <Text dimColor>[</Text>
          <Text>{hint.keyLabel}</Text>
          <Text dimColor>]</Text>
          <Text dimColor> {hint.description}</Text>
        </Box>
      ))}
    </Box>
  );
}

export function Divider() {
  return <Text dimColor>{uiGlyphs.divider.repeat(52)}</Text>;
}
