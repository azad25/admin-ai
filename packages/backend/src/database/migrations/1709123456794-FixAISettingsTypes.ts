import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAISettingsTypes1709123456794 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the column and recreate it with the correct type
    await queryRunner.query(`
      ALTER TABLE "ai_settings"
      DROP COLUMN IF EXISTS "availableModels",
      ADD COLUMN "availableModels" text[] DEFAULT '{}'::text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Convert back to jsonb
    await queryRunner.query(`
      ALTER TABLE "ai_settings"
      DROP COLUMN IF EXISTS "availableModels",
      ADD COLUMN "availableModels" jsonb DEFAULT '[]'::jsonb
    `);
  }
} 