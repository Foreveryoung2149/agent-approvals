import { NextResponse } from "next/server";

/**
 * Web Bot Auth — JWKS endpoint
 * https://datatracker.ietf.org/wg/webbotauth/about/
 *
 * Publishes the public key(s) that receiving sites can use to verify
 * HTTP Message Signatures on requests sent by Nodsend's bot/agent.
 */

const jwks = {
  keys: [
    {
      kty: "EC",
      crv: "P-256",
      x: "y4ENIwVjFF2QDj1vbhw2v69I8TdYnKZN5h0FY5TFfvE",
      y: "GuViWMgyTn5d0n0jtUOZy7aS1q9X2LwbgWbHv8WAgTs",
      kid: "nodsend-bot-1",
      use: "sig",
      alg: "ES256",
    },
  ],
};

function response(includeBody: boolean) {
  return new NextResponse(includeBody ? JSON.stringify(jwks, null, 2) : null, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function GET() {
  return response(true);
}

export function HEAD() {
  return response(false);
}
