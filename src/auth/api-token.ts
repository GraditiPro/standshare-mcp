import type { AuthStrategy } from "../types/index.js";

export class ApiTokenAuth implements AuthStrategy {
  constructor(private token: string) {}

  async getHeaders(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${this.token}` };
  }

  async onUnauthorized(): Promise<boolean> {
    return false;
  }
}
