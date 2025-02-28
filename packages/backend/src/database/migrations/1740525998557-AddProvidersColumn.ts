import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProvidersColumn1740525998557 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First create the table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "enableRandomMessages" boolean NOT NULL DEFAULT true,
                "messageInterval" integer NOT NULL DEFAULT 5000,
                "systemCommands" jsonb NOT NULL DEFAULT '[]',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id")
            );
        `);

        // Then add the providers column
        await queryRunner.query(`
            ALTER TABLE "ai_settings"
            ADD COLUMN IF NOT EXISTS "providers" jsonb NOT NULL DEFAULT '[]';
        `);

        // Add foreign key constraint if it doesn't exist
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_ai_settings_user'
                ) THEN
                    ALTER TABLE "ai_settings"
                    ADD CONSTRAINT "FK_ai_settings_user"
                    FOREIGN KEY ("userId")
                    REFERENCES "user"("id")
                    ON DELETE CASCADE;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "ai_settings"
            DROP CONSTRAINT IF EXISTS "FK_ai_settings_user";
        `);

        await queryRunner.query(`
            ALTER TABLE "ai_settings"
            DROP COLUMN IF EXISTS "providers";
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS "ai_settings";
        `);
    }

}
