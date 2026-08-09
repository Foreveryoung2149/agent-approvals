import {
  API_CATALOG,
  API_CATALOG_MEDIA_TYPE,
  CONTENT_SIGNAL,
} from "../../lib/agent-discovery";

const linkHeader = '</.well-known/api-catalog>; rel="api-catalog"';

function headers() {
  return {
    "Cache-Control": "public, max-age=3600",
    "Content-Signal": CONTENT_SIGNAL,
    "Content-Type": API_CATALOG_MEDIA_TYPE,
    Link: linkHeader,
  };
}

export function GET() {
  return new Response(JSON.stringify(API_CATALOG), {
    status: 200,
    headers: headers(),
  });
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: headers(),
  });
}
