import { EmptyState } from '@/components/EmptyState';
import { IndicatorList } from '@/components/IndicatorList';
import { RiskLevelView } from '@/components/RiskLevelView';
import type { AnalysisResult } from '@/types';

// NFR-01: the result is decision support, not a fraud confirmation.
const DISCLAIMER_TEXT = 'Este resultado es una ayuda para decidir, no una confirmación de fraude.';

interface AnalysisResultViewProps {
  result: AnalysisResult | null;
  isIdle: boolean;
}

export function AnalysisResultView({ result, isIdle }: AnalysisResultViewProps) {
  if (result === null) {
    // The empty state is shown only before the first analysis.
    return isIdle ? <EmptyState /> : null;
  }

  return (
    // No card class: the result column around it is the card (US-5.1).
    <section className="analysis-result" data-testid="analysis-result">
      <RiskLevelView riskLevel={result.riskLevel} />
      <p data-testid="analysis-explanation">{result.explanation}</p>
      <p data-testid="analysis-summary">{result.summary}</p>
      {/* The count is outside the heading so its accessible name stays "Indicadores detectados". */}
      <div className="indicators-header">
        <h2>Indicadores detectados</h2>
        <span className="count-badge" data-testid="analysis-indicators-count">
          {result.indicators.length}
        </span>
      </div>
      <IndicatorList indicators={result.indicators} />
      <p role="note" className="disclaimer" data-testid="analysis-disclaimer">
        {DISCLAIMER_TEXT}
      </p>
    </section>
  );
}
