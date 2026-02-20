/**
 * Secure Password Hashing Utility
 * Uses Web Crypto API (SHA-256 with salt) for browser-compatible password hashing.
 * Since this project is a Firebase frontend (no Node.js backend), we cannot use bcrypt.
 * This provides secure hashing with unique salts per password.
 */

/**
 * Generate a cryptographically random salt
 * @param {number} length - Salt length in bytes (default 16)
 * @returns {string} Hex-encoded salt
 */
function generateSalt(length = 16) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with PBKDF2 (100,000 iterations, SHA-256)
 * Returns salt:hash format for storage
 * @param {string} password - Plain text password
 * @returns {Promise<string>} "salt:hash" format string
 */
export async function hashPassword(password) {
    const salt = generateSalt();
    const encoder = new TextEncoder();

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive 256 bits using PBKDF2 with 100k iterations
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    // Convert to hex
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `${salt}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored "salt:hash" string
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;

    const [salt, originalHash] = storedHash.split(':');
    const encoder = new TextEncoder();

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive bits with the same salt
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    // Convert to hex and compare
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === originalHash;
}
