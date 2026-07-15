// Base32 Decoder mapping (standard RFC 4648)
function base32ToBytes(base32: string): Uint8Array {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanBase32 = base32.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  const bytes = new Uint8Array(Math.floor((cleanBase32.length * 5) / 8));
  
  let val = 0;
  let count = 0;
  let byteIdx = 0;
  
  for (let i = 0; i < cleanBase32.length; i++) {
    const charVal = base32chars.indexOf(cleanBase32.charAt(i));
    if (charVal === -1) {
      throw new Error(`Invalid base32 character: ${cleanBase32.charAt(i)}`);
    }
    val = (val << 5) | charVal;
    count += 5;
    if (count >= 8) {
      bytes[byteIdx++] = (val >>> (count - 8)) & 255;
      count -= 8;
    }
  }
  return bytes;
}

// Generate random 16-character Base32 Secret Key for Authenticator Setup
export function generate2FASecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// Verify TOTP token matching standard Google Authenticator steps
export async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  const cleanToken = token.replace(/\s/g, "");
  if (cleanToken.length !== 6 || isNaN(Number(cleanToken))) return false;

  try {
    const keyBytes = base32ToBytes(secret);
    const timeStep = 30;
    const epoch = Math.floor(new Date().getTime() / 1000.0);
    
    // Check current window and +/- 1 step clock drift (30-second steps)
    const steps = [0, -1, 1];

    for (const step of steps) {
      const counter = Math.floor(epoch / timeStep) + step;
      
      // Convert counter to 8-byte array
      const counterBytes = new Uint8Array(8);
      let tmp = counter;
      for (let i = 7; i >= 0; i--) {
        counterBytes[i] = tmp & 0xff;
        tmp = tmp >>> 8;
      }

      // HMAC-SHA1 signature using SubtleCrypto
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes as any,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
      );

      const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, counterBytes as any);
      const hmac = new Uint8Array(signature);

      // Truncate dynamically
      const offset = hmac[hmac.length - 1] & 0xf;
      const binary = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
      );

      const otp = (binary % 1000000).toString().padStart(6, '0');
      if (otp === cleanToken) {
        return true;
      }
    }
  } catch (err) {
    console.error("TOTP verification error:", err);
  }

  return false;
}
