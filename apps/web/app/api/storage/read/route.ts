import { NextResponse } from "next/server";
import { createStorageReader } from "@/lib/server-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { rootHash?: string; verified?: boolean };
    if (!payload.rootHash) {
      return NextResponse.json({ error: "rootHash is required" }, { status: 400 });
    }

    const reader = createStorageReader();
    const bytes = await reader.readBytes(payload.rootHash, payload.verified);
    return NextResponse.json({
      bytesBase64: Buffer.from(bytes).toString("base64")
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Storage read failed" },
      { status: 500 }
    );
  }
}
