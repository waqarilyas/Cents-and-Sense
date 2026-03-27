import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { CLOUD_CONFIG, hasSupabaseConfig } from "../config/cloud";

const SESSION_KEY = "@supabase_session";

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
  expires_at?: number;
}

const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_BATCH_SIZE = 200;

class SupabaseService {
  private get redirectToUrl(): string {
    return Linking.createURL("auth-callback");
  }

  private get headers() {
    return {
      apikey: CLOUD_CONFIG.supabasePublishableKey,
      "Content-Type": "application/json",
    };
  }

  async isConfigured(): Promise<boolean> {
    return hasSupabaseConfig();
  }

  async signInWithEmailOtp(email: string): Promise<void> {
    if (!hasSupabaseConfig()) {
      throw new Error("Supabase is not configured");
    }

    const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        email,
        create_user: true,
        email_redirect_to: this.redirectToUrl,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to send sign-in email");
    }
  }

  async verifyEmailOtp(email: string, token: string): Promise<SupabaseSession> {
    if (!hasSupabaseConfig()) {
      throw new Error("Supabase is not configured");
    }

    const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email, token, type: "email" }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to verify OTP");
    }

    const data = await res.json();
    const session =
      (data?.session as SupabaseSession | undefined) ||
      (data?.access_token
        ? ({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user,
            expires_at: data.expires_at,
          } as SupabaseSession)
        : null);
    if (!session?.access_token || !session?.user?.id) {
      throw new Error(
        "OTP verified but no usable session returned by Supabase. Please request a new code and try again.",
      );
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async getSession(): Promise<SupabaseSession | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SupabaseSession;
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    const session = await this.getSession();
    if (session && hasSupabaseConfig()) {
      await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          ...this.headers,
          Authorization: `Bearer ${session.access_token}`,
        },
      }).catch(() => undefined);
    }
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  private parseAuthParams(url: string): URLSearchParams {
    const [base, hash = ""] = url.split("#");
    const query = base.includes("?") ? base.split("?")[1] : "";
    const merged = [query, hash].filter(Boolean).join("&");
    return new URLSearchParams(merged);
  }

  private async fetchUser(accessToken: string): Promise<{ id: string; email?: string }> {
    const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        ...this.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch authenticated user");
    }
    const user = (await res.json()) as { id: string; email?: string };
    return user;
  }

  async consumeAuthRedirect(url: string): Promise<SupabaseSession | null> {
    if (!hasSupabaseConfig()) return null;

    const params = this.parseAuthParams(url);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken) {
      const user = await this.fetchUser(accessToken);
      const session: SupabaseSession = {
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        user,
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }

    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (!tokenHash || !type) return null;

    const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        token_hash: tokenHash,
        type,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to consume sign-in link");
    }

    const data = await res.json();
    const session = data?.session as SupabaseSession;
    if (!session?.access_token || !session?.user?.id) {
      return null;
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async upsertRows(
    table: string,
    rows: Record<string, any>[],
    accessToken: string,
  ): Promise<void> {
    if (!rows.length) return;

    for (let i = 0; i < rows.length; i += DEFAULT_BATCH_SIZE) {
      const batch = rows.slice(i, i + DEFAULT_BATCH_SIZE);
      const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          ...this.headers,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text();
        if (text.includes("PGRST205")) {
          throw new Error(
            "Cloud sync tables are missing in Supabase. Run the SQL migration first.",
          );
        }
        throw new Error(text || `Failed syncing ${table}`);
      }
    }
  }

  async pullRows(
    table: string,
    userId: string,
    since: number,
    accessToken: string,
  ): Promise<Record<string, any>[]> {
    const results: Record<string, any>[] = [];
    let offset = 0;

    while (true) {
      const query = new URLSearchParams({
        select: "*",
        userId: `eq.${userId}`,
        updatedAt: `gt.${since}`,
        order: "updatedAt.asc",
        limit: String(DEFAULT_PAGE_SIZE),
        offset: String(offset),
      });

      const res = await fetch(
        `${CLOUD_CONFIG.supabaseUrl}/rest/v1/${table}?${query.toString()}`,
        {
          method: "GET",
          headers: {
            ...this.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        if (text.includes("PGRST205")) {
          throw new Error(
            "Cloud sync tables are missing in Supabase. Run the SQL migration first.",
          );
        }
        throw new Error(text || `Failed pulling ${table}`);
      }

      const page = (await res.json()) as Record<string, any>[];
      results.push(...page);

      if (page.length < DEFAULT_PAGE_SIZE) {
        break;
      }
      offset += DEFAULT_PAGE_SIZE;
    }

    return results;
  }

  async pullAllRows(
    table: string,
    userId: string,
    accessToken: string,
  ): Promise<Record<string, any>[]> {
    return this.pullRows(table, userId, 0, accessToken);
  }

  async countRows(
    table: string,
    userId: string,
    accessToken: string,
  ): Promise<number> {
    const query = new URLSearchParams({
      select: "id",
      userId: `eq.${userId}`,
      limit: "1",
    });

    const res = await fetch(
      `${CLOUD_CONFIG.supabaseUrl}/rest/v1/${table}?${query.toString()}`,
      {
        method: "GET",
        headers: {
          ...this.headers,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "count=exact",
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("PGRST205")) {
        throw new Error(
          "Cloud sync tables are missing in Supabase. Run the SQL migration first.",
        );
      }
      throw new Error(text || `Failed counting ${table}`);
    }

    const contentRange = res.headers.get("content-range");
    if (contentRange && contentRange.includes("/")) {
      const total = Number(contentRange.split("/")[1]);
      if (!Number.isNaN(total)) {
        return total;
      }
    }

    const rows = (await res.json()) as Record<string, any>[];
    return rows.length;
  }

  async verifySyncSchema(accessToken: string): Promise<void> {
    const res = await fetch(
      `${CLOUD_CONFIG.supabaseUrl}/rest/v1/accounts?select=id&limit=1`,
      {
        method: "GET",
        headers: {
          ...this.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("PGRST205")) {
        throw new Error(
          "Supabase schema not initialized. Please run the SQL migration in Supabase first.",
        );
      }
      throw new Error(text || "Supabase schema check failed");
    }
  }
}

export const supabaseService = new SupabaseService();
