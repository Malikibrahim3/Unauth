import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ensureMerchantContextForUser } from "@/lib/account/ensureMerchantContext";
import { beginOAuthConnectionTransaction } from "@/lib/integrations/oauthTransactions";
import {
  ACTIVE_MERCHANT_COOKIE,
  PERMISSIONS,
  requirePermissionForMerchant,
} from "@/lib/permissions";
import { shopifyDebugLog } from "@/lib/shopify/debugLog";
import {
  clearShopifyOAuthCookieOptions,
  shopifyOAuthCookieOptions,
} from "@/lib/shopify/oauthCookies";
import { normalizeShopInput } from "@/lib/shopify/normalizeShopInput";
import { getAppUrl } from "@/lib/utils/appUrl";
import { SHOPIFY_SCOPES } from "@/lib/shopify/scopes";
import { htmlSafeJson } from "@/lib/utils/htmlSafeJson";
import { safeConnectionErrorCode } from "@/lib/integrations/publicErrors";

const INTEGRATIONS_URL = "/integrations";

function oauthCompleteResponse(params: Record<string, string>): NextResponse {
  const appUrl = getAppUrl();
  const fallbackUrl = new URL(INTEGRATIONS_URL, appUrl);
  for (const [key, value] of Object.entries(params)) {
    fallbackUrl.searchParams.set(key, value);
  }

  const error = params.shopify_error ?? null;
  const response = new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Returning to Unauth</title>
    <style>
      body {
        align-items: center;
        background: #f7f5f2;
        color: #211f1c;
        display: flex;
        font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        height: 100vh;
        justify-content: center;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <p>Returning to Unauth...</p>
    <script>
      const payload = ${htmlSafeJson({
        type: "shopify_oauth_complete",
        success: !error,
        error,
      })};
      const targetOrigin = ${htmlSafeJson(new URL(appUrl).origin)};
      const fallbackHref = ${htmlSafeJson(fallbackUrl.toString())};

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, targetOrigin);
          window.close();
        } else {
          window.location.replace(fallbackHref);
        }
      } catch {
        window.location.replace(fallbackHref);
      }
    </script>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );

  return response;
}

export async function GET(request: NextRequest) {
  const shopParam = request.nextUrl.searchParams.get("shop") ?? "";
  const normalized = normalizeShopInput(shopParam);

  shopifyDebugLog("shopify.install.started", {
    hasShopParam: Boolean(shopParam.trim()),
    normalizeError: normalized.error,
  });

  if (normalized.error !== null) {
    const reason =
      normalized.error === "public_domain" ? "public_domain" : "invalid_shop";
    return oauthCompleteResponse({ shopify_error: reason });
  }

  const shop = normalized.domain;
  shopifyDebugLog("shopify.install.normalized", { shopDomain: shop });

  try {
    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = getAppUrl();
    if (!apiKey) {
      shopifyDebugLog("shopify.install.misconfigured", {
        missing: "SHOPIFY_API_KEY",
      });
      return oauthCompleteResponse({ shopify_error: "misconfigured" });
    }

    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/shopify/callback`;

    const supabase = createClient();
    const serviceClient = createServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return oauthCompleteResponse({ shopify_error: "unauthorized" });
    }
    const selectedMerchantId = request.cookies.get(ACTIVE_MERCHANT_COOKIE)?.value ?? null;
    const merchantContext = await ensureMerchantContextForUser(
      serviceClient,
      user,
      selectedMerchantId,
    );
    if (!merchantContext) {
      return oauthCompleteResponse({ shopify_error: "missing_merchant" });
    }
    const authorization = await requirePermissionForMerchant(
      serviceClient,
      user.id,
      merchantContext.merchantId,
      PERMISSIONS.MANAGE_SETTINGS,
    );
    if (authorization.denied) {
      return oauthCompleteResponse({ shopify_error: "forbidden" });
    }

    const state = await beginOAuthConnectionTransaction(serviceClient, {
      merchantId: merchantContext.merchantId,
      userId: user.id,
      providerId: "shopify",
      environment: "production",
      callbackUrl: redirectUri,
      providerAccountHint: shop,
    });
    const scope = SHOPIFY_SCOPES.join(",");
    const installUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    installUrl.searchParams.set("client_id", apiKey);
    installUrl.searchParams.set("scope", scope);
    installUrl.searchParams.set("redirect_uri", redirectUri);
    installUrl.searchParams.set("state", state);

    shopifyDebugLog("oauth.redirect", {
      host: installUrl.host,
      redirectUriHost: new URL(redirectUri).host,
    });

    const response = NextResponse.redirect(installUrl.toString());
    response.cookies.set(
      "shopify_oauth_state",
      state,
      shopifyOAuthCookieOptions(600),
    );

    return response;
  } catch (error) {
    console.error("Shopify install route failed", {
      category: safeConnectionErrorCode(error instanceof Error ? error.message : null)
        ?? "shopify_install_failed",
      shop,
    });
    const response = oauthCompleteResponse({ shopify_error: "install_failed" });
    response.cookies.set(
      "shopify_oauth_state",
      "",
      clearShopifyOAuthCookieOptions(),
    );
    return response;
  }
}
