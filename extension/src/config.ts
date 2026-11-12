// Gmail extension (Feature 11). The backend URL is defined once here; manifest.json repeats its origin in
// host_permissions because a JSON file cannot import it.
export const BACKEND_BASE_URL = 'http://localhost:8000';
export const EMAIL_ANALYSIS_ENDPOINT = `${BACKEND_BASE_URL}/analysis/email`;
