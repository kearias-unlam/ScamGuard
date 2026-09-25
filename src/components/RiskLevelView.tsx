import type { RiskLevel } from '@/types';

// Display-only mapping from the API value to the Spanish UI text.
const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  UNDETERMINED: 'Indeterminado',
};

interface RiskLevelViewProps {
  riskLevel: RiskLevel;
}

export function RiskLevelView({ riskLevel }: RiskLevelViewProps) {
  return (
    <dl>
      <dt>Nivel de riesgo</dt>
      <dd data-testid="analysis-risk-level">{RISK_LEVEL_LABELS[riskLevel]}</dd>
    </dl>
  );
}
