// User-visible texts shared by the web app and the Gmail extension (docs/requirements.md, UI texts).
// Only relative, type-only imports, so the extension's tsc build can compile it by relative path (Feature 11).
import type { RiskLevel } from '../types';

export const ANALYSIS_LOADING_TEXT = 'Analizando mensaje...';

export const RISK_LEVEL_HEADING = 'Nivel de riesgo';

// Display-only mapping from the API value to the Spanish UI text.
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  UNDETERMINED: 'Indeterminado',
};

export const INDICATORS_HEADING = 'Indicadores detectados';
export const NO_INDICATORS_TEXT = 'No se detectaron indicadores.';
export const RECOMMENDATIONS_HEADING = 'Qué podés hacer';
export const DISCLAIMER_TEXT = 'Este resultado es una ayuda para decidir, no una confirmación de fraude.';

// Error texts (US-1.2, US-4.2, US-6.2, US-10.2); the Gmail extension uses the busy and unreadable email ones.
export const ANALYSIS_ERROR_TEXT = 'Los servidores están ocupados. Intentá de nuevo más tarde.';
export const UNREADABLE_EMAIL_ERROR_TEXT =
  'No se pudo leer el correo. Verificá que sea un archivo .eml de hasta 1 MB.';
export const UNREADABLE_URL_ERROR_TEXT =
  'No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com.';
// US-10.2: also the 409 body; shown in the input card and, after a 409, in analysis-error.
export const HISTORY_FULL_TEXT =
  'Llegaste al límite de 3 análisis de la versión gratuita. Eliminá uno del historial para hacer un análisis nuevo.';
export const RETRY_TEXT = 'Reintentar';
