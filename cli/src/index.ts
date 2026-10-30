#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from './app.js';

interface Flags {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  skipOpencodeCheck?: boolean;
}

function parseFlags(): Flags {
  const flags: Flags = {};
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--verbose':
        flags.verbose = true;
        break;
      case '--dry-run':
        flags.dryRun = true;
        break;
      case '--force':
        flags.force = true;
        break;
      case '--skip-opencode-check':
        flags.skipOpencodeCheck = true;
        break;
    }
  }
  
  return flags;
}

const flags = parseFlags();
const inkApp = render(React.createElement(App, { flags }));

try {
  await inkApp.waitUntilExit();
} finally {
  process.stdout.write('\u001B[?25h');
  inkApp.cleanup();
}
