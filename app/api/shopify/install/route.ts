import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ensureMerchantContextForUser } from "@/lib/account/ensureMerchantContext";
import { shopifyDebugLog } from "@/lib/shopify/debugLog";
import {
  clearShopifyOAuthCookieOptions,
  shopifyOAuthCookieOptions,
} from "@/lib/shopify/oauthCookies";
import { normalizeShopInput } from "@/lib/shopify/normalizeShopInput";
import { getAppUrl } from "@/lib/utils/appUrl";
import { SHOPIFY_SCOPES } from "@/lib/shopify/scopes";
import { htmlSafeJson } from "@/lib/utils/htmlSafeJson";

const INTEGRATIONS_URL = "/settings/integrations";

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

    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/shopify/callback`;
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

    const supabase = createClient();
    const serviceClient = createServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const ctx = await ensureMerchantContextForUser(serviceClient, user);
      if (ctx?.merchantId) {
        response.cookies.set(
          "shopify_oauth_merchant_id",
          ctx.merchantId,
          shopifyOAuthCookieOptions(600),
        );
        shopifyDebugLog("shopify.install.merchant_cookie_set", {
          hasMerchantId: true,
        });
      } else {
        shopifyDebugLog("shopify.install.merchant_cookie_set", {
          hasMerchantId: false,
        });
      }
    } else {
      shopifyDebugLog("shopify.install.merchant_cookie_set", {
        hasMerchantId: false,
        reason: "no_user",
      });
    }

    return response;
  } catch (error) {
    console.error("Shopify install route failed", {
      message: error instanceof Error ? error.message : String(error),
      shop,
    });
    const response = oauthCompleteResponse({ shopify_error: "install_failed" });
    response.cookies.set(
      "shopify_oauth_state",
      "",
      clearShopifyOAuthCookieOptions(),
    );
    response.cookies.set(
      "shopify_oauth_merchant_id",
      "",
      clearShopifyOAuthCookieOptions(),
    );
    return response;
  }
}
