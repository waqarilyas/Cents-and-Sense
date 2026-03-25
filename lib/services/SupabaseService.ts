import AsyncStorage from "@react-native-async-storage/async-storage";
import { CLOUD_CONFIG, hasSupabaseConfig } from "../config/cloud";

const SESSION_KEY = "@supabase_session";

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
  expires_at?: number;
}

class SupabaseService {
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
      body: JSON.stringify({ email, create_user: true }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to send OTP");
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
    const session = data?.session as SupabaseSession;
    if (!session?.access_token || !session?.user?.id) {
      throw new Error("Invalid auth response from Supabase");
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

  async upsertRows(
    table: string,
    rows: Record<string, any>[],
    accessToken: string,
  ): Promise<void> {
    if (!rows.length) return;

    const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...this.headers,
        Authorization: `Bearer ${accessToken}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
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

  async pullRows(
    table: string,
    userId: string,
    since: number,
    accessToken: string,
  ): Promise<Record<string, any>[]> {
    const query = new URLSearchParams({
      select: "*",
      userId: `eq.${userId}`,
      updatedAt: `gt.${since}`,
      order: "updatedAt.asc",
      limit: "500",
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

    return (await res.json()) as Record<string, any>[];
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
