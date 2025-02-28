const crypto = require('crypto');
const { Pool } = require('pg');

// Configuration
const API_KEY = 'AIzaSyBnVkT9wiLnMv_RQmVIEkb-meUgPL2qXKs';
const ENCRYPTION_KEY = '8b50afb9f4dc3f4c3ee6b5084ace1d7b0bcb455c68eb95d8eaa2dbd68d70ac9f';

// Ensure the key is exactly 32 bytes
const KEY_BUFFER = Buffer.alloc(32);
Buffer.from(ENCRYPTION_KEY, 'hex').copy(KEY_BUFFER);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
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

async function addProvider() {
  const pool = new Pool({
    user: 'postgres',
    database: 'admin_ai',
    port: 5432
  });

  try {
    // First encrypt the API key
    const encryptedKey = encrypt(API_KEY);
    
    // Verify we can decrypt it
    const decryptedKey = decrypt(encryptedKey);
    console.log('Encryption test:');
    console.log('Original:', API_KEY);
    console.log('Decrypted:', decryptedKey);
    console.log('Encryption verified:', API_KEY === decryptedKey);

    if (API_KEY !== decryptedKey) {
      throw new Error('Encryption verification failed');
    }

    const providerConfig = {
      provider: 'gemini',
      apiKey: encryptedKey,
      isActive: true,
      isVerified: true,
      selectedModel: 'gemini-2.0-flash',
      lastVerified: new Date().toISOString(),
      availableModels: ['gemini-2.0-flash', 'gemini-pro', 'gemini-pro-vision']
    };

    const userIds = [
      '00000000-0000-0000-0000-000000000001',
      '139656b7-8cdc-4f0d-9c0d-aacfb28b217a'
    ];

    for (const userId of userIds) {
      await pool.query(
        `UPDATE ai_settings 
         SET providers = jsonb_build_array($1::jsonb)
         WHERE "userId" = $2`,
        [JSON.stringify(providerConfig), userId]
      );
    }

    console.log('Successfully added provider settings');

    // Verify the settings were saved correctly
    const result = await pool.query(
      `SELECT "userId", providers 
       FROM ai_settings 
       WHERE "userId" IN ('00000000-0000-0000-0000-000000000001', '139656b7-8cdc-4f0d-9c0d-aacfb28b217a')`
    );

    for (const row of result.rows) {
      console.log(`\nVerifying settings for user ${row.userId}:`);
      const provider = row.providers[0];
      console.log('Provider:', provider.provider);
      console.log('Encrypted key:', provider.apiKey);
      const verifiedKey = decrypt(provider.apiKey);
      console.log('Decrypted key:', verifiedKey);
      console.log('Verification:', API_KEY === verifiedKey ? 'SUCCESS' : 'FAILED');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addProvider().catch(console.error); 