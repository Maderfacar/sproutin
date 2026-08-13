// 統一 API 回應信封 (§11, docs/07-api-contract.md)

export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export const ok = <T>(data: T, meta?: ApiMeta): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  ...(meta ? { meta } : {}),
});

export const fail = (code: string, message: string): ApiResponse<null> => ({
  success: false,
  data: null,
  error: { code, message },
});
