import { CheckIcon } from '@/components/CheckIcon';
import type { Recommendation } from '@/types';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

// US-7.1: the backend always sends at least one; an empty list renders nothing, not an empty section.
export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <>
      <h2 className="recommendations-heading">Qué podés hacer</h2>
      <ul className="recommendation-list" data-testid="analysis-recommendations">
        {recommendations.map((recommendation, index) => (
          <li key={`${recommendation.type}-${index}`} className="recommendation" data-testid="analysis-recommendation">
            <CheckIcon />
            <span>{recommendation.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
