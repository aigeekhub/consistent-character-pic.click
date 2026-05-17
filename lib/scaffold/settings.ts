import { AppSetting } from './types';

export let settings: AppSetting[] = [
  {
    key: 'APP_NAME',
    label: 'Application Name',
    description: 'The name displayed in the UI.',
    value: 'KineticID',
    category: 'General',
    type: 'string',
  },
  {
    key: 'MAX_BATCH_SIZE',
    label: 'Max Batch Size',
    description: 'The maximum number of images that can be generated in one batch.',
    value: 10,
    category: 'Generation',
    type: 'number',
  },
  {
    key: 'MAINTENANCE_MODE',
    label: 'Maintenance Mode',
    description: 'Disables the application for everyone except admins.',
    value: false,
    category: 'Security',
    type: 'boolean',
  }
];

export function getAppSettings() {
  return settings;
}

export function getAppSetting(key: string): any {
  const setting = settings.find((s) => s.key === key);
  return setting ? setting.value : null;
}

export function updateAppSetting(key: string, value: any) {
  const index = settings.findIndex((s) => s.key === key);
  if (index !== -1) {
    settings[index].value = value;
  }
}
