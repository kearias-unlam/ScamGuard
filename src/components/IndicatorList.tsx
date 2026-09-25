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
          <p>{indicator.description}</p>
        </li>
      ))}
    </ul>
  );
}
