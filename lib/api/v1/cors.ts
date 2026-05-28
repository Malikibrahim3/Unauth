import { NextRequest, NextResponse } from 'next/server';

function isAllowedV1CorsOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'https:') return false;
    if (hostname === 'zendesk.com' || hostname.endsWith('.zendesk.com')) return true;
    if (hostname === 'zdassets.com' || hostname.endsWith('.zdassets.com')) return true;
    return false;
  } catch {
    return false;
  }
}

/** CORS headers for browser clients (e.g. Zendesk sidebar iframe). */
export function v1CorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !isAllowedV1CorsOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    Vary: 'Origin',
  };
}

export function withV1Cors(response: NextResponse, request: NextRequest): NextResponse {
  const headers = v1CorsHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export function v1OptionsResponse(request: NextRequest): NextResponse {
  const headers = v1CorsHeaders(request);
  if (Object.keys(headers).length === 0) {
    return new NextResponse(null, { status: 204 });
  }
  return new NextResponse(null, { status: 204, headers });
}
