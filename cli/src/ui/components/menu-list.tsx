import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { uiColors, uiGlyphs } from './theme.js';

export type MenuItem<T> =
  | { type: 'section'; key: string; label: string }
  | { type: 'action'; key: string; label: string; value: T; tone?: 'default' | 'secondary' | 'danger' };

interface MenuListProps<T> {
  items: Array<MenuItem<T>>;
  initialValue?: T;
  onSelect: (value: T) => void;
  onEscape?: () => void;
}

function getInitialIndex<T>(items: Array<MenuItem<T>>, initialValue?: T): number {
  if (initialValue !== undefined) {
    const index = items.findIndex((item) => item.type === 'action' && item.value === initialValue);
    if (index >= 0) {
      return index;
    }
  }

  return Math.max(0, items.findIndex((item) => item.type === 'action'));
}

function getNextActionIndex<T>(
  items: Array<MenuItem<T>>,
  currentIndex: number,
  direction: 1 | -1
): number {
  for (let offset = 1; offset <= items.length; offset++) {
    const nextIndex = (currentIndex + offset * direction + items.length) % items.length;
    if (items[nextIndex]?.type === 'action') {
      return nextIndex;
    }
  }

  return currentIndex;
}

export function MenuList<T>({
  items,
  initialValue,
  onSelect,
  onEscape,
}: MenuListProps<T>) {
  const normalizedItems = useMemo(() => items, [items]);
  const [selectedIndex, setSelectedIndex] = useState(() => getInitialIndex(normalizedItems, initialValue));

  useEffect(() => {
    setSelectedIndex(getInitialIndex(normalizedItems, initialValue));
  }, [normalizedItems, initialValue]);

  useInput((input, key) => {
    if (key.escape) {
      onEscape?.();
      return;
    }

    if (input === 'k' || key.upArrow) {
      setSelectedIndex((currentIndex) => getNextActionIndex(normalizedItems, currentIndex, -1));
      return;
    }

    if (input === 'j' || key.downArrow) {
      setSelectedIndex((currentIndex) => getNextActionIndex(normalizedItems, currentIndex, 1));
      return;
    }

    if (!key.return) {
      return;
    }

    const selectedItem = normalizedItems[selectedIndex];
    if (selectedItem?.type === 'action') {
      onSelect(selectedItem.value);
    }
  });

  return (
    <Box flexDirection="column">
      {normalizedItems.map((item, index) => {
        if (item.type === 'section') {
          return (
            <Box key={item.key} marginTop={index === 0 ? 0 : 1}>
              <Text dimColor>{item.label}</Text>
            </Box>
          );
        }

        const isSelected = index === selectedIndex;
        const color = isSelected ? uiColors.accent : undefined;
        const isDimmed = !isSelected;

        return (
          <Box key={item.key}>
            <Box width={2}>
              <Text color={isSelected ? uiColors.selected : undefined}>
                {isSelected ? uiGlyphs.pointer : ' '}
              </Text>
            </Box>
            <Text color={color} dimColor={isDimmed}>
              {item.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
