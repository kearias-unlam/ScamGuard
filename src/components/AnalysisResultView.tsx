import type { AnalysisResult } from '@/types';

interface AnalysisResultViewProps {
  result: AnalysisResult | null;
}

export function AnalysisResultView({ result }: AnalysisResultViewProps) {
  if (result === null) {
    return <div data-testid="analysis-result-empty">No analysis has been run yet.</div>;
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
