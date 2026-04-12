import { NextResponse } from "next/server";

// Fallback: if the magic link arrives with ?code= instead of hash, redirect to home
export async function GET(request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(new URL("/", origin));
}
