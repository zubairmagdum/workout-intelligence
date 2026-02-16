import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}
