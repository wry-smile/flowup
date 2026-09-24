import { renderEta } from './eta'
import licenseTemplate from '../files/shared/LICENSE.eta?raw'

export function renderMitLicense(holder = 'Flowup contributors'): string {
  return renderEta(licenseTemplate, { year: new Date().getFullYear(), author: holder })
}
