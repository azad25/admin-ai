const crypto = require('crypto');
const { Pool } = require('pg');

// New encryption key (32 bytes in hex)
const NEW_ENCRYPTION_KEY = '9996552167bd8969cad1d032e6a8920c245629d4157dc43c78f770826835fbb7';

// Create a 32-byte buffer from the hex key
const KEY_BUFFER = Buffer.from(NEW_ENCRYPTION_KEY, 'hex');

// Encryption functions
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

async function updateEncryption() {
  const pool = new Pool({
    user: 'postgres',
    database: 'admin_ai',
    port: 5432
  });

  try {
    // Get all settings that have providers
    const result = await pool.query(
      `SELECT "userId", providers 
       FROM ai_settings 
       WHERE providers IS NOT NULL AND jsonb_array_length(providers) > 0`
    );

    console.log(`Found ${result.rows.length} settings to update`);

    for (const row of result.rows) {
      console.log(`\nProcessing user ${row.userId}:`);
      const providers = row.providers;
      
      // Process each provider
      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        console.log(`Provider: ${provider.provider}`);
        
        if (provider.apiKey && provider.apiKey !== '********') {
          try {
            // Re-encrypt with new key
            const encryptedKey = encrypt(provider.apiKey);
            
            // Update the provider's API key
            await pool.query(
              `UPDATE ai_settings 
               SET providers = jsonb_set(
                 providers,
                 $1,
                 $2::jsonb,
                 true
               )
               WHERE "userId" = $3`,
              [
                `{${i},apiKey}`,
                JSON.stringify(encryptedKey),
                row.userId
              ]
            );
            
            console.log('Successfully updated encryption');
          } catch (error) {
            console.error('Failed to update provider:', error);
          }
        }
      }
    }

    console.log('\nEncryption update completed');
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

// Run the update
updateEncryption().catch(console.error); 