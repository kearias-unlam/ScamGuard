import { EmptyState } from '@/components/EmptyState';
import { IndicatorList } from '@/components/IndicatorList';
import { RiskLevelView } from '@/components/RiskLevelView';
import type { AnalysisResult } from '@/types';

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
    <section data-testid="analysis-result">
      <RiskLevelView riskLevel={result.riskLevel} />
      <p data-testid="analysis-explanation">{result.explanation}</p>
      <p data-testid="analysis-summary">{result.summary}</p>
      <IndicatorList indicators={result.indicators} />
    </section>
  );
}
