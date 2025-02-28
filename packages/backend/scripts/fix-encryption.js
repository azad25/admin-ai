const crypto = require('crypto');
const { Pool } = require('pg');

// Configuration
const API_KEY = 'AIzaSyBnVkT9wiLnMv_RQmVIEkb-meUgPL2qXKs';
const DEFAULT_KEY = 'default-32-byte-encryption-key!!!!';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY;

// Ensure the key is exactly 32 bytes
const KEY_BUFFER = Buffer.alloc(32);
if (ENCRYPTION_KEY.length === 64) {
  Buffer.from(ENCRYPTION_KEY, 'hex').copy(KEY_BUFFER);
} else {
  Buffer.from(ENCRYPTION_KEY).copy(KEY_BUFFER);
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

async function updateDatabase() {
  const pool = new Pool({
    user: 'postgres',
    database: 'admin_ai',
    port: 5432
  });

  try {
    const encryptedKey = encrypt(API_KEY);
    const providerConfig = {
      apiKey: encryptedKey,
      isActive: true,
      isVerified: true,
      selectedModel: 'gemini-2.0-flash',
      lastVerified: new Date().toISOString(),
      availableModels: ['gemini-2.0-flash']
    };

    const userIds = [
      '00000000-0000-0000-0000-000000000001',
      '139656b7-8cdc-4f0d-9c0d-aacfb28b217a'
    ];

    for (const userId of userIds) {
      await pool.query(
        `UPDATE ai_settings 
         SET providers = jsonb_set(
           COALESCE(providers, '[]'::jsonb),
           '{0}',
           $1::jsonb
         )
         WHERE "userId" = $2`,
        [JSON.stringify({ ...providerConfig, provider: 'gemini' }), userId]
      );
    }

    console.log('Successfully updated provider settings with encrypted API key');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await pool.end();
  }
}

updateDatabase(); 