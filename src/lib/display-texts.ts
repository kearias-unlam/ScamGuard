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
