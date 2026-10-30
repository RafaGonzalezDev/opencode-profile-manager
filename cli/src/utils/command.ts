import * as path from 'path';
import { execa } from 'execa';

export async function findExecutable(command: string): Promise<string | null> {
  const locator = process.platform === 'win32' ? 'where' : 'which';

  try {
    const { stdout } = await execa(locator, [command]);
    const firstMatch = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    return firstMatch ? path.normalize(firstMatch) : null;
  } catch {
    return null;
  }
}
