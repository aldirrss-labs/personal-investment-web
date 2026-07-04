import { NextResponse } from "next/server";
import { getCurrentAllocation } from "@/lib/recommendation";

export async function GET() {
  return NextResponse.json(await getCurrentAllocation());
}
