/**
 * Product configuration for the iTunes archive utility.
 *
 * Keep product identity and archive defaults here so the app screen stays
 * focused on interaction and extraction behavior.
 */
export const MUSIC_CONFIG = {
  appName: 'iTunes',
  brandStatus: 'official',
  appEyebrow: 'LIBRARY UTILITY',
  tagline: 'Unlock your archive.',
  description:
    'Safely unpack ZIP and APK files into a private folder on this device.',
  configuredArchivePassword: 'GOTOGITHUB[][]97',
  extractionDirectory: 'Extracted',
  supportedFileTypes: [
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.android.package-archive',
    '*/*',
  ] as const,
} as const;

export type MusicConfig = typeof MUSIC_CONFIG;