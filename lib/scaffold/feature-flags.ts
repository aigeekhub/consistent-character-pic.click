import { FeatureFlag } from './types';

// In-memory store for now. In a real app, this would be persisted in a DB.
export let flags: FeatureFlag[] = [
  {
    key: 'ENABLE_UPSCALE_TOOL',
    label: 'Enable Upscale Tool',
    description: 'Allows users to upscale generated images.',
    enabled: true,
    fallbackValue: false,
  },
  {
    key: 'ENABLE_REFINEMENT_TOOL',
    label: 'Enable Refinement Tool',
    description: 'Allows users to refine specific parts of an image.',
    enabled: true,
    fallbackValue: false,
  },
  {
    key: 'DEBUG_MODE',
    label: 'Debugger Mode',
    description: 'Enables detailed logging and developer tools.',
    enabled: false,
    fallbackValue: false,
  }
];

export function getFeatureFlags() {
  return flags;
}

export function isFeatureEnabled(key: string): boolean {
  const flag = flags.find((f) => f.key === key);
  return flag ? flag.enabled : false;
}

export function updateFeatureFlag(key: string, enabled: boolean) {
  const index = flags.findIndex((f) => f.key === key);
  if (index !== -1) {
    flags[index].enabled = enabled;
  }
}
