import type { Indicator } from '@/types';

interface IndicatorListProps {
  indicators: Indicator[];
}

export function IndicatorList({ indicators }: IndicatorListProps) {
  if (indicators.length === 0) {
    return <p data-testid="analysis-indicators-empty">No se detectaron indicadores.</p>;
  }

  return (
    <ul data-testid="analysis-indicators">
      {indicators.map((indicator, index) => (
        // The model may return several indicators of the same type.
        <li key={`${indicator.type}-${index}`} data-testid="analysis-indicator">
          <h3>{indicator.title}</h3>
          {/* Model inference. */}
          <p>{indicator.description}</p>
          {/* Literal quote from the submitted message, kept separate from the inference. */}
          <blockquote data-testid="analysis-indicator-evidence">{indicator.evidence}</blockquote>
        </li>
      ))}
    </ul>
  );
}
