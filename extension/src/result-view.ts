// US-11.2 (#121): render the analysis result in the popup with plain DOM (display mapping only).
// Same content and texts as the web result (Features 2, 4, and 7); texts come from the shared module.
// textContent only, never innerHTML: every value comes from the model or the email.
import type { MessageAnalysisResponse } from '../../src/types.js';
import {
  DISCLAIMER_TEXT,
  INDICATORS_HEADING,
  NO_INDICATORS_TEXT,
  RECOMMENDATIONS_HEADING,
  RISK_LEVEL_HEADING,
  RISK_LEVEL_LABELS,
} from '../../src/lib/display-texts.js';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) {
    node.textContent = text;
  }
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  return node;
}

export function renderResult(container: HTMLElement, { result, recommendations }: MessageAnalysisResponse): void {
  const riskLevel = element('dl', undefined, { class: 'risk-level' });
  riskLevel.append(
    element('dt', RISK_LEVEL_HEADING),
    element('dd', RISK_LEVEL_LABELS[result.riskLevel], {
      class: 'risk-badge',
      'data-risk-level': result.riskLevel,
      'data-testid': 'analysis-risk-level',
    }),
  );

  const indicators: HTMLElement[] = [element('h2', INDICATORS_HEADING)];
  if (result.indicators.length === 0) {
    indicators.push(element('p', NO_INDICATORS_TEXT, { class: 'muted', 'data-testid': 'analysis-indicators-empty' }));
  } else {
    const list = element('ul', undefined, { class: 'result-list', 'data-testid': 'analysis-indicators' });
    for (const indicator of result.indicators) {
      const item = element('li', undefined, { 'data-testid': 'analysis-indicator' });
      item.append(
        element('h3', indicator.title),
        element('p', indicator.description),
        element('blockquote', indicator.evidence, { class: 'evidence', 'data-testid': 'analysis-indicator-evidence' }),
      );
      list.append(item);
    }
    indicators.push(list);
  }

  const recommendationNodes: HTMLElement[] = [];
  if (recommendations.length > 0) {
    const list = element('ul', undefined, { class: 'result-list', 'data-testid': 'analysis-recommendations' });
    for (const recommendation of recommendations) {
      list.append(element('li', recommendation.text, { 'data-testid': 'analysis-recommendation' }));
    }
    recommendationNodes.push(element('h2', RECOMMENDATIONS_HEADING), list);
  }

  container.replaceChildren(
    riskLevel,
    element('p', result.explanation, { 'data-testid': 'analysis-explanation' }),
    element('p', result.summary, { 'data-testid': 'analysis-summary' }),
    ...indicators,
    ...recommendationNodes,
    element('p', DISCLAIMER_TEXT, { role: 'note', class: 'disclaimer', 'data-testid': 'analysis-disclaimer' }),
  );
  container.hidden = false;
}

export function clearResult(container: HTMLElement): void {
  container.replaceChildren();
  container.hidden = true;
}
