import { NextRequest, NextResponse } from "next/server";
import { getTransactions, addTransaction } from "@/lib/repo";

export async function GET() {
  return NextResponse.json(await getTransactions());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await addTransaction(body);
  return NextResponse.json({ ok: true });
}
