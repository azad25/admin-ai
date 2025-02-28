import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAISettingsSchema1740744409811 implements MigrationInterface {
    name = 'UpdateAISettingsSchema1740744409811'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, create a temporary table to store the old data
        await queryRunner.query(`
            CREATE TEMPORARY TABLE temp_ai_settings AS
            SELECT id, "userId", provider, "apiKey", "isActive", "isVerified", 
                   "selectedModel", "availableModels", settings, "lastVerified"
            FROM ai_settings;
        `);

        // Drop the old table
        await queryRunner.query(`DROP TABLE "ai_settings"`);

        // Create the new table with updated schema
        await queryRunner.query(`
            CREATE TABLE "ai_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "providers" jsonb NOT NULL DEFAULT '[]',
                "enableRandomMessages" boolean NOT NULL DEFAULT true,
                "messageInterval" integer NOT NULL DEFAULT 5000,
                "systemCommands" text array NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id")
            )
        `);

        // Migrate the old data to the new format
        await queryRunner.query(`
            INSERT INTO ai_settings ("id", "userId", "providers")
            SELECT 
                id, 
                "userId",
                jsonb_build_array(
                    jsonb_build_object(
                        'provider', provider,
                        'apiKey', "apiKey",
                        'isActive', "isActive",
                        'isVerified', "isVerified",
                        'selectedModel', "selectedModel",
                        'availableModels', "availableModels",
                        'settings', settings,
                        'lastVerified', "lastVerified"
                    )
                )
            FROM temp_ai_settings;
        `);

        // Drop the temporary table
        await queryRunner.query(`DROP TABLE temp_ai_settings`);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "ai_settings" 
            ADD CONSTRAINT "FK_ai_settings_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "ai_settings" 
            DROP CONSTRAINT "FK_ai_settings_user"
        `);

        // Create temporary table for new data
        await queryRunner.query(`
            CREATE TEMPORARY TABLE temp_ai_settings AS
            SELECT id, "userId", providers
            FROM ai_settings;
        `);

        // Drop the new table
        await queryRunner.query(`DROP TABLE "ai_settings"`);

        // Create the old table structure
        await queryRunner.query(`
            CREATE TABLE "ai_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "provider" character varying NOT NULL,
                "apiKey" text NOT NULL,
                "isActive" boolean NOT NULL DEFAULT false,
                "isVerified" boolean NOT NULL DEFAULT false,
                "selectedModel" text,
                "availableModels" text[] DEFAULT '{}',
                "settings" jsonb DEFAULT '{}',
                "lastVerified" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id")
            )
        `);

        // Migrate the data back to the old format
        await queryRunner.query(`
            INSERT INTO ai_settings (
                "id", "userId", "provider", "apiKey", "isActive", "isVerified",
                "selectedModel", "availableModels", "settings", "lastVerified"
            )
            SELECT 
                t.id,
                t."userId",
                (p->>'provider')::character varying,
                p->>'apiKey',
                (p->>'isActive')::boolean,
                (p->>'isVerified')::boolean,
                p->>'selectedModel',
                ARRAY(SELECT jsonb_array_elements_text(p->'availableModels')),
                p->'settings',
                (p->>'lastVerified')::timestamp
            FROM temp_ai_settings t
            CROSS JOIN LATERAL jsonb_array_elements(t.providers) p;
        `);

        // Drop the temporary table
        await queryRunner.query(`DROP TABLE temp_ai_settings`);

        // Add back the foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "ai_settings" 
            ADD CONSTRAINT "FK_ai_settings_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id") 
            ON DELETE CASCADE
        `);
    }
}
