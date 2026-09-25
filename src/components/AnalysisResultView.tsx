import type { AnalysisResult } from '@/types';

interface AnalysisResultViewProps {
  result: AnalysisResult | null;
  isIdle: boolean;
}

export function AnalysisResultView({ result, isIdle }: AnalysisResultViewProps) {
  if (result === null) {
    // The empty state is shown only before the first analysis.
    return isIdle ? (
      <div data-testid="analysis-result-empty">No analysis has been run yet.</div>
    ) : null;
  }

  return (
    <section data-testid="analysis-result">
      <p data-testid="analysis-risk-level">{result.riskLevel}</p>
      <p data-testid="analysis-summary">{result.summary}</p>
      <ul data-testid="analysis-indicators">
        {result.indicators.map((indicator) => (
          <li key={indicator.type} data-testid="analysis-indicator">
            <h3>{indicator.title}</h3>
            <p>{indicator.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
