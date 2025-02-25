import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1709123456789 implements MigrationInterface {
  name = 'InitialMigration1709123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `);

    // Create enum type for user roles
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER')
    `);

    // Create enum type for AI providers
    await queryRunner.query(`
      CREATE TYPE "public"."ai_provider_enum" AS ENUM('openai', 'gemini', 'anthropic')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id")
      )
    `);

    // Create crud_page table
    await queryRunner.query(`
      CREATE TABLE "crud_page" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "endpoint" character varying NOT NULL,
        "description" character varying NULL,
        "schema" jsonb NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}',
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crud_page" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crud_page_user" FOREIGN KEY ("userId") 
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    // Create ai_settings table
    await queryRunner.query(`
      CREATE TABLE "ai_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" "public"."ai_provider_enum" NOT NULL,
        "apiKey" character varying NOT NULL,
        "selectedModel" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT false,
        "settings" jsonb NOT NULL DEFAULT '{}',
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ai_settings_provider_user" UNIQUE ("provider", "userId"),
        CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_settings_user" FOREIGN KEY ("userId") 
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    // Create api_key table
    await queryRunner.query(`
      CREATE TABLE "api_key" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "key" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastUsed" TIMESTAMP,
        CONSTRAINT "UQ_api_key_key" UNIQUE ("key"),
        CONSTRAINT "PK_api_key" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_key_user" FOREIGN KEY ("userId") 
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    // Create widget table
    await queryRunner.query(`
      CREATE TYPE "public"."widget_type_enum" AS ENUM(
        'CHART', 'TABLE', 'METRIC', 'MAP', 'WEATHER', 'STATUS'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "widget" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "public"."widget_type_enum" NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}',
        "position" jsonb NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_widget" PRIMARY KEY ("id"),
        CONSTRAINT "FK_widget_user" FOREIGN KEY ("userId") 
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_user_email" ON "user"("email")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_key_user" ON "api_key"("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_widget_user" ON "widget"("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_crud_page_user" ON "crud_page"("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "ai_settings"`);
    await queryRunner.query(`DROP TABLE "crud_page"`);
    await queryRunner.query(`DROP TABLE "widget"`);
    await queryRunner.query(`DROP TABLE "api_key"`);
    await queryRunner.query(`DROP TABLE "user"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "public"."ai_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."widget_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);

    // Drop extension
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
} 