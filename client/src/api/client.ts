import { useUserPreferencesStore } from '../stores/user-preferences.store';

export interface ApiProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export class ApiException extends Error {
  constructor(public problem: ApiProblemDetails) {
    super(problem.detail || problem.title || `API Request failed with status ${problem.status}`);
    this.name = 'ApiException';
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v2';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const operatorName = useUserPreferencesStore.getState().operatorName;
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    'X-Operator': encodeURIComponent(operatorName),
    ...(options.headers as Record<string, string> || {}),
  };

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let problem: ApiProblemDetails;
      try {
        problem = await response.json();
      } catch {
        problem = {
          title: response.statusText || 'HTTP Error',
          status: response.status,
          detail: await response.text().catch(() => undefined),
        };
      }
      throw new ApiException(problem);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    throw new ApiException({
      title: 'Network Error',
      status: 0,
      detail: (error as Error).message || 'Failed to connect to backend server',
    });
  }
}
