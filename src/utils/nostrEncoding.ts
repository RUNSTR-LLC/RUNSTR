/**
 * Custom Bech32 Encoding for React Native
 * Implements nsec/npub encoding that works in React Native environment
 * Avoids the Uint8Array recognition issues with nostr-tools
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function polymod(values: number[]): number {
  const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const b = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ value;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) >> 5);
  }
  result.push(0);
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) & 31);
  }
  return result;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ 1;
  const result: number[] = [];
  for (let i = 0; i < 6; i++) {
    result.push((mod >> 5 * (5 - i)) & 31);
  }
  return result;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;

  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }

  return result;
}

export function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(createChecksum(hrp, data));
  let result = hrp + '1';
  for (const value of combined) {
    result += CHARSET[value];
  }
  return result;
}

export function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Encode a hex private key as nsec
 * @param privateKeyHex - 64 character hex string
 * @returns nsec1... encoded private key
 */
export function nsecEncode(privateKeyHex: string): string {
  try {
    // Validate input
    if (!privateKeyHex || privateKeyHex.length !== 64) {
      throw new Error('Invalid private key hex: must be 64 characters');
    }

    // Convert hex to byte array
    const bytes = hexToBytes(privateKeyHex);

    // Convert 8-bit bytes to 5-bit groups for bech32
    const words = convertBits(bytes, 8, 5, true);

    if (!words) {
      throw new Error('Failed to convert bits for bech32 encoding');
    }

    // Encode with 'nsec' human-readable part
    const encoded = bech32Encode('nsec', words);

    console.log('[NostrEncoding] Successfully encoded nsec:', encoded.slice(0, 10) + '...');
    return encoded;
  } catch (error) {
    console.error('[NostrEncoding] nsecEncode error:', error);
    throw error;
  }
}

/**
 * Encode a hex public key as npub
 * @param publicKeyHex - 64 character hex string
 * @returns npub1... encoded public key
 */
export function npubEncode(publicKeyHex: string): string {
  try {
    // Validate input
    if (!publicKeyHex || publicKeyHex.length !== 64) {
      throw new Error('Invalid public key hex: must be 64 characters');
    }

    const bytes = hexToBytes(publicKeyHex);
    const words = convertBits(bytes, 8, 5, true);

    if (!words) {
      throw new Error('Failed to convert bits for bech32 encoding');
    }

    const encoded = bech32Encode('npub', words);

    console.log('[NostrEncoding] Successfully encoded npub:', encoded.slice(0, 20) + '...');
    return encoded;
  } catch (error) {
    console.error('[NostrEncoding] npubEncode error:', error);
    throw error;
  }
}

/**
 * Decode nsec to hex private key
 * @param nsec - nsec1... encoded private key
 * @returns hex private key string
 */
export function nsecDecode(nsec: string): string {
  try {
    if (!nsec || !nsec.startsWith('nsec1')) {
      throw new Error('Invalid nsec format');
    }

    // Remove the 'nsec1' prefix and decode
    const data = nsec.slice(5);
    const decoded: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const value = CHARSET.indexOf(char);
      if (value === -1) {
        throw new Error(`Invalid character in nsec: ${char}`);
      }
      decoded.push(value);
    }

    // Remove checksum (last 6 characters)
    const words = decoded.slice(0, -6);

    // Convert 5-bit groups back to 8-bit bytes
    const bytes = convertBits(words, 5, 8, false);

    if (!bytes) {
      throw new Error('Failed to decode nsec');
    }

    // Convert bytes to hex
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');

    return hex;
  } catch (error) {
    console.error('[NostrEncoding] nsecDecode error:', error);
    throw error;
  }
}