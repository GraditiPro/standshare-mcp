import type { AuthStrategy } from "../types/index.js";

export class UserLoginAuth implements AuthStrategy {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    private apiUrl: string,
    private email: string,
    private password: string,
    private tenantSlug: string
  ) {}

  async getHeaders(): Promise<Record<string, string>> {
    if (!this.accessToken) {
      await this.login();
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async onUnauthorized(): Promise<boolean> {
    if (this.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) return true;
    }
    try {
      await this.login();
      return true;
    } catch {
      return false;
    }
  }

  private async login(): Promise<void> {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": this.tenantSlug,
      },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
  }

  private async refresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Slug": this.tenantSlug,
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      return true;
    } catch {
      return false;
    }
  }
}
