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
    <section className="card analysis-result" data-testid="analysis-result">
      <RiskLevelView riskLevel={result.riskLevel} />
      <p data-testid="analysis-explanation">{result.explanation}</p>
      <p data-testid="analysis-summary">{result.summary}</p>
      <IndicatorList indicators={result.indicators} />
      <p role="note" className="disclaimer" data-testid="analysis-disclaimer">
        {DISCLAIMER_TEXT}
      </p>
    </section>
  );
}
