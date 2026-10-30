export const REQUIRED_PROFILE_FILES = ['AGENTS.md', 'opencode.json'] as const;
export const OPTIONAL_PROFILE_FILES = ['tui.json'] as const;
export const SHARED_CONFIG_FILES = ['.env.example'] as const;
export const REQUIRED_CONFIG_DIRECTORIES = ['agents', 'skills'] as const;
export const OPTIONAL_CONFIG_DIRECTORIES = ['themes'] as const;
export const MANAGED_CONFIG_DIRECTORIES = [
  ...REQUIRED_CONFIG_DIRECTORIES,
  ...OPTIONAL_CONFIG_DIRECTORIES,
] as const;

export const REQUIRED_PROFILE_ENTRIES = [
  ...REQUIRED_PROFILE_FILES,
  ...REQUIRED_CONFIG_DIRECTORIES,
] as const;

export const PROFILE_CONFIG_ENTRIES = [
  ...REQUIRED_PROFILE_FILES,
  ...OPTIONAL_PROFILE_FILES,
  ...MANAGED_CONFIG_DIRECTORIES,
] as const;

export const MANAGED_CONFIG_FILES = [
  ...REQUIRED_PROFILE_FILES,
  ...OPTIONAL_PROFILE_FILES,
  ...SHARED_CONFIG_FILES,
] as const;

export const MANAGED_CONFIG_ENTRIES = [
  ...PROFILE_CONFIG_ENTRIES,
  ...SHARED_CONFIG_FILES,
] as const;
