// Simple settings service using environment-like config
// In production, this would be stored in database

let settings = {
  emailVerification: false // default OFF
};

export function getSettings() {
  return { ...settings };
}

export function updateSettings(newSettings: Partial<typeof settings>) {
  settings = { ...settings, ...newSettings };
  return { ...settings };
}
