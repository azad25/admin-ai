import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAISettings1709123456790 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_settings"
      ADD COLUMN "isVerified" boolean NOT NULL DEFAULT false,
      ADD COLUMN "availableModels" jsonb,
      ADD COLUMN "lastVerified" TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_settings"
      DROP COLUMN "isVerified",
      DROP COLUMN "availableModels",
      DROP COLUMN "lastVerified";
    `);
  }
} 