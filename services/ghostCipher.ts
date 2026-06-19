/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                    GHOST CIPHER ENGINE v1.0                     ║
 * ║              AES-256-GCM + ECDH + HKDF + PBKDF2                ║
 * ║                                                                  ║
 * ║  This module implements real, standards-compliant encryption     ║
 * ║  using the Web Crypto API. It provides:                          ║
 * ║                                                                  ║
 * ║  • AES-256-GCM authenticated encryption (256-bit keys)          ║
 * ║  • ECDH P-256 key exchange (Ephemeral + Static)                 ║
 * ║  • HKDF-SHA-256 key derivation for shared secrets               ║
 * ║  • PBKDF2 passphrase-based key derivation for storage           ║
 * ║  • Per-message random 96-bit IV (nonce)                         ║
 * ║  • Integrity verification via GCM authentication tags           ║
 * ║                                                                  ║
 * ║  Security guarantee: AES-256-GCM is considered computationally  ║
 * ║  infeasible to break with current or foreseeable technology.     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────

export interface GhostKeyPair {
  publicKey: JsonWebKey;   // Exportable ECDH public key
  privateKey: CryptoKey;   // Non-exportable ECDH private key (stays in memory)
  fingerprint: string;     // SHA-256 fingerprint of the public key
}

export interface EncryptedPayload {
  ciphertext: string;      // Base64-encoded ciphertext
  iv: string;              // Base64-encoded 96-bit initialization vector
  salt: string;            // Base64-encoded salt (for key derivation context)
  ephemeralKey?: string;   // Base64-encoded ephemeral public key (for ECDH)
  tag: string;             // Authentication tag (embedded in GCM ciphertext)
  algorithm: 'AES-256-GCM';
  version: 1;
}

export interface CipherStats {
  messagesEncrypted: number;
  messagesDecrypted: number;
  keysGenerated: number;
  totalBytesEncrypted: number;
  lastActivity: number;
}

// ────────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────────

/** Convert ArrayBuffer to Base64 string */
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/** Convert Base64 string to ArrayBuffer */
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/** Generate cryptographically secure random bytes */
const getRandomBytes = (length: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(length));
};

/** Generate a SHA-256 fingerprint from a JWK public key */
const generateFingerprint = async (publicKey: JsonWebKey): Promise<string> => {
  const keyString = JSON.stringify(publicKey);
  const encoded = new TextEncoder().encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = new Uint8Array(hashBuffer);
  // Format as hex pairs separated by colons (like SSH fingerprints)
  return Array.from(hashArray.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
};

// ────────────────────────────────────────────────────────────────────
// GHOST CIPHER ENGINE
// ────────────────────────────────────────────────────────────────────

class GhostCipherEngine {
  private stats: CipherStats = {
    messagesEncrypted: 0,
    messagesDecrypted: 0,
    keysGenerated: 0,
    totalBytesEncrypted: 0,
    lastActivity: Date.now(),
  };

  // Cache for derived keys (peerId -> CryptoKey)
  private sharedKeyCache: Map<string, CryptoKey> = new Map();

  // ──────────────────────────────────────────────────────────────
  // KEY GENERATION
  // ──────────────────────────────────────────────────────────────

  /**
   * Generate an ECDH P-256 key pair for key exchange.
   * The private key is non-extractable for security.
   */
  async generateKeyPair(): Promise<GhostKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false, // private key not extractable
      ['deriveKey', 'deriveBits']
    );

    // Export public key as JWK for transmission/storage
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const fingerprint = await generateFingerprint(publicKeyJwk);

    this.stats.keysGenerated++;
    this.stats.lastActivity = Date.now();

    console.log(`[GHOST_CIPHER] 🔑 Key pair generated | Fingerprint: ${fingerprint}`);

    return {
      publicKey: publicKeyJwk,
      privateKey: keyPair.privateKey,
      fingerprint,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // KEY EXCHANGE (ECDH + HKDF)
  // ──────────────────────────────────────────────────────────────

  /**
   * Derive a shared AES-256-GCM key from our private key and peer's public key
   * using ECDH key agreement + HKDF key derivation.
   */
  async deriveSharedKey(
    privateKey: CryptoKey,
    peerPublicKeyJwk: JsonWebKey,
    context?: string
  ): Promise<CryptoKey> {
    // Import peer's public key
    const peerPublicKey = await crypto.subtle.importKey(
      'jwk',
      peerPublicKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Perform ECDH to get shared secret bits
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: peerPublicKey },
      privateKey,
      256
    );

    // Use HKDF to derive a proper AES key from the shared secret
    const hkdfKey = await crypto.subtle.importKey(
      'raw',
      sharedBits,
      'HKDF',
      false,
      ['deriveKey']
    );

    const salt = new TextEncoder().encode(context || 'ghost-mesh-v1');
    const info = new TextEncoder().encode('ghost-cipher-aes-256-gcm');

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: info,
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    console.log(`[GHOST_CIPHER] 🤝 Shared key derived via ECDH+HKDF`);
    return aesKey;
  }

  /**
   * Get or derive a cached shared key for a peer.
   */
  async getSharedKey(
    peerId: string,
    privateKey: CryptoKey,
    peerPublicKeyJwk: JsonWebKey
  ): Promise<CryptoKey> {
    if (this.sharedKeyCache.has(peerId)) {
      return this.sharedKeyCache.get(peerId)!;
    }

    const key = await this.deriveSharedKey(privateKey, peerPublicKeyJwk, `peer-${peerId}`);
    this.sharedKeyCache.set(peerId, key);
    return key;
  }

  // ──────────────────────────────────────────────────────────────
  // PASSPHRASE-BASED KEY (PBKDF2) — for at-rest encryption
  // ──────────────────────────────────────────────────────────────

  /**
   * Derive an AES-256-GCM key from a passphrase using PBKDF2.
   * Uses 600,000 iterations of SHA-256 (OWASP recommended).
   */
  async deriveKeyFromPassphrase(
    passphrase: string,
    salt?: Uint8Array
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const actualSalt = salt || getRandomBytes(32);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: 600000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, salt: actualSalt };
  }

  // ──────────────────────────────────────────────────────────────
  // SYMMETRIC ENCRYPTION (AES-256-GCM)
  // ──────────────────────────────────────────────────────────────

  /**
   * Encrypt a plaintext message using AES-256-GCM.
   * 
   * AES-256-GCM provides:
   * - 256-bit key (2^256 possible keys — computationally unbreakable)
   * - Authenticated encryption (detects tampering)
   * - Random 96-bit IV ensures unique ciphertext even for identical messages
   */
  async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
    const iv = getRandomBytes(12); // 96-bit IV (NIST recommended for GCM)
    const salt = getRandomBytes(16);
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: new TextEncoder().encode('ghost-mesh-authenticated'), // AAD
        tagLength: 128, // 128-bit auth tag
      },
      key,
      encoded
    );

    this.stats.messagesEncrypted++;
    this.stats.totalBytesEncrypted += plaintext.length;
    this.stats.lastActivity = Date.now();

    return {
      ciphertext: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      tag: 'embedded', // GCM appends tag to ciphertext
      algorithm: 'AES-256-GCM',
      version: 1,
    };
  }

  /**
   * Decrypt an AES-256-GCM encrypted payload.
   * Verifies integrity via the authentication tag.
   */
  async decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: new TextEncoder().encode('ghost-mesh-authenticated'),
        tagLength: 128,
      },
      key,
      ciphertext
    );

    this.stats.messagesDecrypted++;
    this.stats.lastActivity = Date.now();

    return new TextDecoder().decode(decrypted);
  }

  // ──────────────────────────────────────────────────────────────
  // HIGH-LEVEL MESSAGE ENCRYPTION API
  // ──────────────────────────────────────────────────────────────

  /**
   * Encrypt a message for transit using a device-derived key.
   * This creates a one-time encryption suitable for message storage.
   */
  async encryptMessage(plaintext: string, deviceSecret: string): Promise<EncryptedPayload> {
    const salt = getRandomBytes(32);
    const { key } = await this.deriveKeyFromPassphrase(deviceSecret, salt);
    const payload = await this.encrypt(plaintext, key);
    payload.salt = bufferToBase64(salt); // Store the salt used
    return payload;
  }

  /**
   * Decrypt a message using the device-derived key.
   */
  async decryptMessage(payload: EncryptedPayload, deviceSecret: string): Promise<string> {
    const salt = new Uint8Array(base64ToBuffer(payload.salt));
    const { key } = await this.deriveKeyFromPassphrase(deviceSecret, salt);
    return this.decrypt(payload, key);
  }

  // ──────────────────────────────────────────────────────────────
  // STORAGE ENCRYPTION (for localStorage at-rest protection)
  // ──────────────────────────────────────────────────────────────

  /**
   * Encrypt data for local storage using a fixed device key.
   * Uses a simpler (but still AES-256-GCM) approach for storage.
   */
  async encryptForStorage(data: any, storageKey: string): Promise<string> {
    const plaintext = JSON.stringify(data);
    const salt = getRandomBytes(32);
    const { key } = await this.deriveKeyFromPassphrase(storageKey, salt);
    const payload = await this.encrypt(plaintext, key);
    payload.salt = bufferToBase64(salt);
    return JSON.stringify(payload);
  }

  /**
   * Decrypt data from local storage.
   */
  async decryptFromStorage(encryptedString: string, storageKey: string): Promise<any> {
    try {
      const payload: EncryptedPayload = JSON.parse(encryptedString);

      // Validate it's actually a GhostCipher payload
      if (payload.algorithm !== 'AES-256-GCM' || payload.version !== 1) {
        throw new Error('Invalid cipher payload');
      }

      const salt = new Uint8Array(base64ToBuffer(payload.salt));
      const { key } = await this.deriveKeyFromPassphrase(storageKey, salt);
      const decrypted = await this.decrypt(payload, key);
      return JSON.parse(decrypted);
    } catch (e) {
      // Fallback: try parsing as plain JSON (migration from old unencrypted data)
      try {
        return JSON.parse(encryptedString);
      } catch {
        console.warn('[GHOST_CIPHER] ⚠️ Failed to decrypt storage data');
        return null;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // QUICK SYMMETRIC ENCRYPT/DECRYPT (for in-memory operations)
  // Uses a randomly generated key each time — suitable for
  // ephemeral encryption where key is passed alongside.
  // ──────────────────────────────────────────────────────────────

  /**
   * Generate a random AES-256-GCM key for one-time use.
   */
  async generateSymmetricKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable for export
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Quick encrypt with a new random key. Returns both the payload and the key.
   */
  async quickEncrypt(plaintext: string): Promise<{ payload: EncryptedPayload; key: CryptoKey }> {
    const key = await this.generateSymmetricKey();
    const payload = await this.encrypt(plaintext, key);
    return { payload, key };
  }

  // ──────────────────────────────────────────────────────────────
  // STATS & DIAGNOSTICS
  // ──────────────────────────────────────────────────────────────

  getStats(): CipherStats {
    return { ...this.stats };
  }

  clearKeyCache(): void {
    this.sharedKeyCache.clear();
    console.log('[GHOST_CIPHER] 🗑️ Key cache cleared');
  }

  /**
   * Get a human-readable cipher info string for UI display.
   */
  getCipherInfo(): string {
    return `AES-256-GCM | ECDH-P256 | HKDF-SHA256 | PBKDF2-600K`;
  }
}

// ────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ────────────────────────────────────────────────────────────────────

export const ghostCipher = new GhostCipherEngine();

// ────────────────────────────────────────────────────────────────────
// DEVICE SECRET MANAGEMENT
// ────────────────────────────────────────────────────────────────────

const DEVICE_SECRET_KEY = 'ghost_mesh_device_secret_v1';

/**
 * Get or create a persistent device secret for storage encryption.
 * This is stored in localStorage and acts as the root key for
 * encrypting all local data.
 */
export const getDeviceSecret = (): string => {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    // Generate a 256-bit random secret, encoded as hex
    const bytes = getRandomBytes(32);
    secret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
    console.log('[GHOST_CIPHER] 🔐 New device secret generated');
  }
  return secret;
};
