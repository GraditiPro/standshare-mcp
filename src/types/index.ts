export interface AuthStrategy {
  getHeaders(): Promise<Record<string, string>>;
  /** Called on 401 to attempt token refresh. Returns true if refresh succeeded. */
  onUnauthorized(): Promise<boolean>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  pagination?: PaginationInfo;
}

export interface ToolSuccess {
  content: Array<{ type: "text"; text: string }>;
}

export interface ToolError {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
}

export type ToolResult = ToolSuccess | ToolError;

export function toolSuccess(text: string): ToolSuccess {
  return { content: [{ type: "text", text }] };
}

export function toolError(message: string): ToolError {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}
