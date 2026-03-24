export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp?: string;
}

export interface ApiResponseError {
  error: ApiError;
}

export function isApiResponseError(data: unknown): data is ApiResponseError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiResponseError).error === 'object' &&
    'code' in (data as ApiResponseError).error &&
    'message' in (data as ApiResponseError).error
  );
}

export function parseApiError(response: Response, data: unknown): string {
  if (isApiResponseError(data)) {
    return data.error.message;
  }
  
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    return String((data as { detail: string }).detail);
  }
  
  if (response.status === 401) {
    return '未授权，请重新登录';
  }
  
  if (response.status === 403) {
    return '权限不足';
  }
  
  if (response.status === 404) {
    return '资源不存在';
  }
  
  if (response.status === 400) {
    return '请求参数错误';
  }
  
  if (response.status >= 500) {
    return '服务器错误，请稍后重试';
  }
  
  return '请求失败';
}

export async function handleApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return parseApiError(response, data);
  } catch {
    return parseApiError(response, null);
  }
}