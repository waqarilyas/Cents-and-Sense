// Deno Edge Function for RevenueCat webhook ingestion.
// Deploy with Supabase CLI and set REVENUECAT_WEBHOOK_SECRET + SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") || "";

const supabase = createClient(url, serviceRole);

function deriveEntitlementActiveState(
  eventType: string,
  expirationAtMs: number | null,
): boolean {
  const terminalInactiveEvents = new Set([
    "EXPIRATION",
    "REFUND",
    "CANCELLATION",
    "BILLING_ISSUE",
    "SUBSCRIPTION_PAUSED",
  ]);

  if (terminalInactiveEvents.has(eventType)) {
    if (eventType === "CANCELLATION" && expirationAtMs && expirationAtMs > Date.now()) {
      // User turned off auto-renew, but entitlement is still active until expiration.
      return true;
    }
    return false;
  }

  if (expirationAtMs) {
    return expirationAtMs > Date.now();
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("X-RevenueCat-Signature") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";
    const providedSecret = signature || bearerToken;

    if (webhookSecret && providedSecret !== webhookSecret) {
      return new Response("Unauthorized (invalid webhook secret)", { status: 401 });
    }

    const payload = await req.json();
    const event = payload?.event || {};

    const eventId = event.id || null;
    const appUserId = event.app_user_id || null;
    const eventType = event.type || "unknown";
    const entitlement = event.entitlement_id || null;
    const productId = event.product_id || null;
    const expirationAtMs = event.expiration_at_ms
      ? Number(event.expiration_at_ms)
      : null;
    const expiresDate = expirationAtMs
      ? new Date(expirationAtMs).toISOString()
      : null;

    let userId: string | null = null;
    if (appUserId && appUserId.includes("-")) {
      userId = appUserId;
    }

    const eventInsert = await supabase.from("revenuecat_events").upsert(
      {
        event_id: eventId,
        user_id: userId,
        event_type: eventType,
        payload,
      },
      { onConflict: "event_id", ignoreDuplicates: true },
    );
    if (eventInsert.error) {
      throw eventInsert.error;
    }

    if (userId && entitlement) {
      const isActive = deriveEntitlementActiveState(eventType, expirationAtMs);

      const entitlementInsert = await supabase.from("entitlements").insert({
        user_id: userId,
        entitlement,
        is_active: isActive,
        product_id: productId,
        expires_at: expiresDate,
        payload,
      });
      if (entitlementInsert.error) {
        throw entitlementInsert.error;
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(`error: ${error instanceof Error ? error.message : "unknown"}`, {
      status: 500,
    });
  }
});
