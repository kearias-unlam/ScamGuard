'use strict';

const BACKEND_URL = 'http://localhost:8000/analysis/url';
const UNREADABLE_URL_ERROR =
  'No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com.';
const SERVER_ERROR =
  'Los servidores están ocupados. Intentá de nuevo más tarde.';
const CONNECTION_ERROR =
  'No se pudo conectar con ScamGuard. Verificá la conexión e intentá de nuevo.';
const UNAVAILABLE_PAGE_ERROR =
  'Esta página no se puede analizar. Elegí una página web con una URL http o https.';

const elements = {
  activeUrl: document.getElementById('active-url'),
  analyzeButton: document.getElementById('analyze-url-button'),
  initialState: document.getElementById('initial-state'),
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  retryButton: document.getElementById('retry-analysis-button'),
  result: document.getElementById('analysis-result'),
  riskLevel: document.getElementById('risk-level'),
  summary: document.getElementById('analysis-summary'),
  explanation: document.getElementById('analysis-explanation'),
  indicators: document.getElementById('analysis-indicators'),
  recommendations: document.getElementById('analysis-recommendations'),
};

// Keep the submitted URL independent from the active tab while the popup remains open.
let confirmedUrl = null;
let requestInProgress = false;

function isSupportedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function setHidden(element, hidden) {
  element.hidden = hidden;
}

function clearResult() {
  elements.riskLevel.textContent = '';
  elements.summary.textContent = '';
  elements.explanation.textContent = '';
  elements.indicators.replaceChildren();
  elements.recommendations.replaceChildren();
  setHidden(elements.result, true);
}

function clearError() {
  elements.errorState.textContent = '';
  setHidden(elements.errorState, true);
  setHidden(elements.retryButton, true);
}

function setInitialState() {
  clearError();
  clearResult();
  elements.initialState.textContent = 'Listo para analizar.';
  setHidden(elements.initialState, false);
  setHidden(elements.loadingState, true);
}

function setUnavailableState(message) {
  clearError();
  clearResult();
  elements.initialState.textContent = message;
  setHidden(elements.initialState, false);
  setHidden(elements.loadingState, true);
  elements.analyzeButton.disabled = true;
}

function setLoadingState() {
  clearError();
  clearResult();
  setHidden(elements.initialState, true);
  setHidden(elements.loadingState, false);
  elements.analyzeButton.disabled = true;
}

function setErrorState(message, canRetry) {
  clearResult();
  setHidden(elements.initialState, true);
  setHidden(elements.loadingState, true);
  elements.errorState.textContent = message;
  setHidden(elements.errorState, false);
  setHidden(elements.retryButton, !canRetry);
  elements.analyzeButton.disabled = true;
}

function createIndicatorElement(indicator) {
  // Build every dynamic node explicitly so backend content is never interpreted as HTML.
  const item = document.createElement('li');
  const title = document.createElement('strong');
  const description = document.createElement('p');
  const evidence = document.createElement('blockquote');

  title.textContent = indicator.title || indicator.type || '';
  description.textContent = indicator.description || '';
  evidence.textContent = indicator.evidence || '';
  item.append(title, description, evidence);
  return item;
}

function createRecommendationElement(recommendation) {
  const item = document.createElement('li');
  const type = document.createElement('strong');
  const text = document.createElement('span');

  type.textContent = recommendation.type || '';
  text.textContent = recommendation.text || '';
  item.append(type, text);
  return item;
}

function showResult(response) {
  const result = response.result;
  const indicators = Array.isArray(result.indicators) ? result.indicators : [];
  const recommendations = Array.isArray(response.recommendations) ? response.recommendations : [];

  elements.riskLevel.textContent = result.riskLevel || '';
  elements.summary.textContent = result.summary || '';
  elements.explanation.textContent = result.explanation || '';
  elements.indicators.replaceChildren(...indicators.map(createIndicatorElement));
  elements.recommendations.replaceChildren(...recommendations.map(createRecommendationElement));
  setHidden(elements.initialState, true);
  setHidden(elements.loadingState, true);
  clearError();
  setHidden(elements.result, false);
  elements.analyzeButton.disabled = false;
}

function errorDetails(status) {
  if (status === 422) {
    return { message: UNREADABLE_URL_ERROR, canRetry: false };
  }
  if (status === 503) {
    return { message: SERVER_ERROR, canRetry: true };
  }
  return {
    message: `ScamGuard no pudo analizar el link (HTTP ${status}).`,
    canRetry: false,
  };
}

async function requestAnalysis(url) {
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw Object.assign(new Error('Analysis request failed'), { status: response.status });
  }

  return response.json();
}

async function analyzeConfirmedUrl() {
  if (requestInProgress || confirmedUrl === null) {
    return;
  }

  requestInProgress = true;
  setLoadingState();

  try {
    const response = await requestAnalysis(confirmedUrl);
    showResult(response);
  } catch (error) {
    const details =
      error && typeof error.status === 'number'
        ? errorDetails(error.status)
        : { message: CONNECTION_ERROR, canRetry: true };
    setErrorState(details.message, details.canRetry);
  } finally {
    requestInProgress = false;
  }
}

function handleQueryError() {
  elements.activeUrl.value = '';
  confirmedUrl = null;
  setUnavailableState(UNAVAILABLE_PAGE_ERROR);
}

function handleActiveTab(tabs) {
  const tab = tabs[0];
  const url = tab && typeof tab.url === 'string' ? tab.url : '';

  if (!isSupportedUrl(url)) {
    handleQueryError();
    return;
  }

  elements.activeUrl.value = url;
  confirmedUrl = url;
  setInitialState();
  elements.analyzeButton.disabled = false;
}

function initialize() {
  elements.analyzeButton.disabled = true;
  elements.retryButton.addEventListener('click', analyzeConfirmedUrl);
  elements.analyzeButton.addEventListener('click', analyzeConfirmedUrl);

  // activeTab grants temporary access to the active tab after the user opens the popup.
  chrome.tabs.query(
    { active: true, lastFocusedWindow: true },
    (tabs) => {
      if (chrome.runtime.lastError) {
        handleQueryError();
        return;
      }
      handleActiveTab(tabs);
    },
  );
}

initialize();
