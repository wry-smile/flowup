export const SUPPORTED_LOCALES = {
  'de': 'German',
  'en-US': 'English (US)',
  'es-ES': 'Spanish',
  'fr': 'French',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt-BR': 'Portuguese (Brazil)',
  'ru': 'Russian',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
} as const

export type LocaleCode = keyof typeof SUPPORTED_LOCALES

export const DEFAULT_LOCALES: LocaleCode[] = ['en-US', 'zh-CN']
