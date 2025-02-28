import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSecurityEventsMessage1740686972346 implements MigrationInterface {
    name = 'FixSecurityEventsMessage1740686972346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the column if it exists (to handle failed previous attempts)
        await queryRunner.query(`
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE "security_events" DROP COLUMN IF EXISTS "message";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);
        
        // Add the column as nullable
        await queryRunner.query(`ALTER TABLE "security_events" ADD "message" character varying NULL`);
        
        // Update existing rows with a default value based on description
        await queryRunner.query(`
            UPDATE "security_events" 
            SET "message" = CASE
                WHEN description IS NOT NULL THEN LEFT(description, 100)
                ELSE 'Legacy security event'
            END
            WHERE "message" IS NULL
        `);
        
        // Make the column NOT NULL
        await queryRunner.query(`ALTER TABLE "security_events" ALTER COLUMN "message" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "security_events" DROP COLUMN "message"`);
    }
} 