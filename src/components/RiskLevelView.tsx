import { RISK_LEVEL_HEADING, RISK_LEVEL_LABELS } from '@/lib/display-texts';
import type { RiskLevel } from '@/types';

interface RiskLevelViewProps {
  riskLevel: RiskLevel;
}

export function RiskLevelView({ riskLevel }: RiskLevelViewProps) {
  return (
    <dl className="risk-level">
      <dt>{RISK_LEVEL_HEADING}</dt>
      {/* data-risk-level only drives the badge color; the Spanish label is always shown. */}
      <dd className="risk-badge" data-risk-level={riskLevel} data-testid="analysis-risk-level">
        {RISK_LEVEL_LABELS[riskLevel]}
      </dd>
    </dl>
  );
}
