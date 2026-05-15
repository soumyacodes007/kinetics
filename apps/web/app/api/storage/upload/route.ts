import { NextResponse } from "next/server";
import { createStorageWriter } from "@/lib/server-storage";

export const runtime = "nodejs";

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { filename?: string; bytesBase64?: string };
    if (!payload.filename || !payload.bytesBase64) {
      return NextResponse.json({ error: "filename and bytesBase64 are required" }, { status: 400 });
    }

    const writer = createStorageWriter();
    const uploaded = await writer.uploadBytes(base64ToBytes(payload.bytesBase64), payload.filename);
    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Storage upload failed" },
      { status: 500 }
    );
  }
}
