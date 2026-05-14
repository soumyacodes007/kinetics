import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
export async function withTempFile(bytes, filename, fn) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kinetics-"));
    const filePath = path.join(dir, `${randomBytes(4).toString("hex")}-${filename}`);
    try {
        await writeFile(filePath, bytes);
        return await fn(filePath);
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
}
export async function readFileBytes(filePath) {
    const content = await readFile(filePath);
    return new Uint8Array(content);
}
//# sourceMappingURL=temp-file.js.map