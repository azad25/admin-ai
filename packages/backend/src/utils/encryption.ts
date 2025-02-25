import crypto from 'crypto';

// Use a default key that is exactly 32 bytes (256 bits) long
const DEFAULT_KEY = 'default-32-byte-encryption-key!!!!';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY;

// Ensure the key is exactly 32 bytes by using SHA256
const KEY_BUFFER = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
} 