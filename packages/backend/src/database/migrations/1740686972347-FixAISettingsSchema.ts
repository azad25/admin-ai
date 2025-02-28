import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAISettingsSchema1740686972347 implements MigrationInterface {
    name = 'FixAISettingsSchema1740686972347'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, migrate data from old columns to new structure
        await queryRunner.query(`
            UPDATE ai_settings
            SET providers = jsonb_build_array(
                jsonb_build_object(
                    'provider', provider,
                    'apiKey', apiKey,
                    'selectedModel', selectedModel,
                    'isActive', "isActive",
                    'isVerified', "isVerified",
                    'lastVerified', "lastVerified",
                    'availableModels', "availableModels",
                    'settings', settings
                )
            )
            WHERE providers = '[]'::jsonb
        `);

        // Drop old columns
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS provider`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "isActive"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS settings`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "isVerified"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "lastVerified"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "availableModels"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "apiKey"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "selectedModel"`);

        // Add new columns if they don't exist
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'ai_settings' AND column_name = 'enableRandomMessages'
                ) THEN
                    ALTER TABLE ai_settings ADD COLUMN "enableRandomMessages" boolean NOT NULL DEFAULT true;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'ai_settings' AND column_name = 'messageInterval'
                ) THEN
                    ALTER TABLE ai_settings ADD COLUMN "messageInterval" integer NOT NULL DEFAULT 5000;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'ai_settings' AND column_name = 'systemCommands'
                ) THEN
                    ALTER TABLE ai_settings ADD COLUMN "systemCommands" jsonb NOT NULL DEFAULT '[]'::jsonb;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert the changes if needed
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "enableRandomMessages"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "messageInterval"`);
        await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS "systemCommands"`);
    }
} 