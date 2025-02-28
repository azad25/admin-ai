const crypto = require('crypto');
const { Pool } = require('pg');

// Configuration
const DEFAULT_KEY = 'default-32-byte-encryption-key!!!!';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY;

// Ensure the key is exactly 32 bytes
const KEY_BUFFER = Buffer.alloc(32);
if (ENCRYPTION_KEY.length === 64) {
  Buffer.from(ENCRYPTION_KEY, 'hex').copy(KEY_BUFFER);
} else {
  Buffer.from(ENCRYPTION_KEY).copy(KEY_BUFFER);
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function checkKey() {
  const pool = new Pool({
    user: 'postgres',
    database: 'admin_ai',
    port: 5432
  });

  try {
    const result = await pool.query(
      `SELECT "userId", providers 
       FROM ai_settings 
       WHERE "userId" IN ('00000000-0000-0000-0000-000000000001', '139656b7-8cdc-4f0d-9c0d-aacfb28b217a')`
    );

    for (const row of result.rows) {
      console.log(`\nChecking settings for user ${row.userId}:`);
      const providers = row.providers;
      
      for (const provider of providers) {
        console.log(`\nProvider: ${provider.provider}`);
        console.log('Encrypted key:', provider.apiKey);
        try {
          const decryptedKey = decrypt(provider.apiKey);
          console.log('Decrypted key:', decryptedKey);
        } catch (error) {
          console.error('Failed to decrypt key:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkKey().catch(console.error); 