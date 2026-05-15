export interface UploadedRoot {
  rootHash: string;
  transactionHash: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function expectOk(response: Response) {
  if (response.ok) {
    return response;
  }

  let message = `Request failed with ${response.status}`;
  try {
    const json = await response.json();
    message = json.error ?? message;
  } catch {
    // Ignore parse failures.
  }
  throw new Error(message);
}

export async function uploadBytes(filename: string, bytes: Uint8Array): Promise<UploadedRoot> {
  const response = await expectOk(
    await fetch("/api/storage/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        filename,
        bytesBase64: bytesToBase64(bytes)
      })
    })
  );

  return response.json() as Promise<UploadedRoot>;
}

export async function readBytes(rootHash: string, verified = false): Promise<Uint8Array> {
  const response = await expectOk(
    await fetch("/api/storage/read", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rootHash,
        verified
      })
    })
  );
  const payload = (await response.json()) as { bytesBase64: string };
  return base64ToBytes(payload.bytesBase64);
}

export async function readJson<T>(rootHash: string, verified = false): Promise<T> {
  const bytes = await readBytes(rootHash, verified);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
