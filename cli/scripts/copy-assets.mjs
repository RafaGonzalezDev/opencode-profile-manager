import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(cliDir, '..');
const profilesSourceDir = path.join(repoDir, 'profiles');
const sharedEnvSourcePath = path.join(repoDir, '.env.example');
const assetsTargetDir = path.resolve(cliDir, 'dist', 'assets');
const profilesTargetDir = path.join(assetsTargetDir, 'profiles');
const sharedTargetDir = path.join(assetsTargetDir, 'shared');

if (!fs.existsSync(profilesSourceDir)) {
  throw new Error(`Missing profiles assets directory: ${profilesSourceDir}`);
}

if (!fs.existsSync(sharedEnvSourcePath)) {
  throw new Error(`Missing shared environment example: ${sharedEnvSourcePath}`);
}

fs.rmSync(assetsTargetDir, { recursive: true, force: true });
fs.mkdirSync(sharedTargetDir, { recursive: true });
fs.cpSync(profilesSourceDir, profilesTargetDir, { recursive: true });
fs.copyFileSync(sharedEnvSourcePath, path.join(sharedTargetDir, '.env.example'));
