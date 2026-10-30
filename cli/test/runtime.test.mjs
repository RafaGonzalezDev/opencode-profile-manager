import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { chmodSync } from 'node:fs';
import path from 'node:path';

const TEST_HOME = '/tmp/opencode-runtime-tests';
process.env.HOME = TEST_HOME;

const { installOpenCode, getOpenCodeInstallCommand, getOpenCodeUpdateCommand } = await import('../dist/installers/opencode.js');

async function writeExecutable(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  chmodSync(filePath, 0o755);
}

test('runtime install returns a recoverable warning when the method binary is installed but PATH is not active', async () => {
  const fakeRoot = '/tmp/opencode-runtime-fixture';
  const fakeBin = path.join(fakeRoot, 'bin');
  const fakePrefix = path.join(fakeRoot, 'global-prefix');
  const fakeNodeRoot = path.join(fakeRoot, 'global-root');

  await fs.rm(fakeRoot, { recursive: true, force: true });
  await fs.mkdir(fakeBin, { recursive: true });

  await writeExecutable(
    path.join(fakeBin, 'npm'),
    `#!/bin/sh
set -eu
if [ "$1" = "install" ] && [ "$2" = "-g" ] && [ "$3" = "opencode-ai" ]; then
  mkdir -p "$FAKE_PREFIX/bin" "$FAKE_ROOT/opencode-ai"
  cat > "$FAKE_PREFIX/bin/opencode" <<'SCRIPT'
#!/bin/sh
echo 9.9.9
SCRIPT
  chmod +x "$FAKE_PREFIX/bin/opencode"
  exit 0
fi
if [ "$1" = "prefix" ] && [ "$2" = "-g" ]; then
  printf '%s\n' "$FAKE_PREFIX"
  exit 0
fi
if [ "$1" = "root" ] && [ "$2" = "-g" ]; then
  printf '%s\n' "$FAKE_ROOT"
  exit 0
fi
if [ "$1" = "list" ] && [ "$2" = "-g" ]; then
  if [ -d "$FAKE_ROOT/opencode-ai" ]; then
    printf 'opencode-ai\n'
    exit 0
  fi
  exit 1
fi
exit 1
`
  );

  const originalPath = process.env.PATH;
  process.env.PATH = `${fakeBin}:/usr/bin:/bin`;
  process.env.FAKE_PREFIX = fakePrefix;
  process.env.FAKE_ROOT = fakeNodeRoot;

  try {
    const result = await installOpenCode('npm', () => {});
    assert.equal(result.success, true);
    assert.match(result.warning || '', /PATH does not point/);
  } finally {
    process.env.PATH = originalPath;
    delete process.env.FAKE_PREFIX;
    delete process.env.FAKE_ROOT;
  }
});

test('runtime commands use the official Homebrew tap', async () => {
  assert.equal(getOpenCodeInstallCommand('homebrew'), 'brew install anomalyco/tap/opencode');
  assert.equal(getOpenCodeUpdateCommand('homebrew'), 'brew update && brew upgrade anomalyco/tap/opencode');
});
