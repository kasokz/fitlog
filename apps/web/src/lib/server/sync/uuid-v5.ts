/**
 * UUID v5 (SHA-1, name-based) generator using SubtleCrypto.
 *
 * Uses the RFC 4122 URL namespace so the same exercise name always produces the same UUID,
 * regardless of device or runtime. Zero external dependencies.
 *
 * This is a copy of apps/mobile/src/lib/utils/uuid-v5.ts — both must stay in sync.
 * Node.js provides crypto.subtle via globalThis, so the same implementation works.
 *
 * @module
 */

// RFC 4122 URL namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
const URL_NAMESPACE = new Uint8Array([
	0x6b, 0xa7, 0xb8, 0x10, 0x9d, 0xad, 0x11, 0xd1, 0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30,
	0xc8,
]);

/**
 * Generate a deterministic UUID v5 from a name string using the URL namespace.
 * Same name always produces the same UUID across all devices and runtimes.
 */
export async function uuidv5(name: string): Promise<string> {
	const encoder = new TextEncoder();
	const nameBytes = encoder.encode(name);

	// Concatenate namespace + name
	const data = new Uint8Array(URL_NAMESPACE.length + nameBytes.length);
	data.set(URL_NAMESPACE);
	data.set(nameBytes, URL_NAMESPACE.length);

	// SHA-1 hash
	const hashBuffer = await crypto.subtle.digest("SHA-1", data);
	const hash = new Uint8Array(hashBuffer);

	// Set version 5 (bits 4-7 of byte 6)
	hash[6] = (hash[6] & 0x0f) | 0x50;
	// Set variant (bits 6-7 of byte 8 to 10)
	hash[8] = (hash[8] & 0x3f) | 0x80;

	// Format as UUID string (only first 16 bytes used)
	const hex = Array.from(hash.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
