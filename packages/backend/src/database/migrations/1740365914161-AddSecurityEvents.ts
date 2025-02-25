import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSecurityEvents1740365914161 implements MigrationInterface {
    name = 'AddSecurityEvents1740365914161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_key" DROP CONSTRAINT "FK_api_key_user"`);
        await queryRunner.query(`ALTER TABLE "widget" DROP CONSTRAINT "FK_widget_user"`);
        await queryRunner.query(`ALTER TABLE "crud_data" DROP CONSTRAINT "FK_crud_data_page"`);
        await queryRunner.query(`ALTER TABLE "crud_page" DROP CONSTRAINT "FK_crud_page_user"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP CONSTRAINT "FK_ai_settings_user"`);
        await queryRunner.query(`ALTER TABLE "error_log" DROP CONSTRAINT "FK_error_log_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_api_key_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_widget_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_crud_data_page"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_crud_page_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_error_log_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_system_metrics_timestamp"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP CONSTRAINT "UQ_ai_settings_provider_user"`);
        await queryRunner.query(`ALTER TABLE "api_key" DROP CONSTRAINT "UQ_api_key_key"`);
        await queryRunner.query(`ALTER TABLE "api_key" DROP COLUMN "lastUsed"`);
        await queryRunner.query(`ALTER TABLE "api_key" ADD "lastUsed" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TYPE "public"."widget_type_enum" RENAME TO "widget_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."widget_type_enum" AS ENUM('CHART', 'TABLE', 'METRIC', 'MAP', 'WEATHER', 'STATUS')`);
        await queryRunner.query(`ALTER TABLE "widget" ALTER COLUMN "type" TYPE "public"."widget_type_enum" USING "type"::"text"::"public"."widget_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."widget_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "widget" ALTER COLUMN "config" DROP DEFAULT`);
        await queryRunner.query(`ALTER TYPE "public"."ai_provider_enum" RENAME TO "ai_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ai_settings_provider_enum" AS ENUM('openai', 'anthropic', 'gemini')`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ALTER COLUMN "provider" TYPE "public"."ai_settings_provider_enum" USING "provider"::"text"::"public"."ai_settings_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ai_provider_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP COLUMN "apiKey"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD "apiKey" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP COLUMN "selectedModel"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD "selectedModel" text`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ALTER COLUMN "availableModels" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum" USING "role"::"text"::"public"."user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "activeUsers" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "totalRequests" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "averageResponseTime" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "errorCount" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "warningCount" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "api_key" ADD CONSTRAINT "FK_277972f4944205eb29127f9bb6c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "widget" ADD CONSTRAINT "FK_57d08c3b59060bb5ccbe439e353" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crud_data" ADD CONSTRAINT "FK_b024725814e88e3dcdeae87ab64" FOREIGN KEY ("pageId") REFERENCES "crud_page"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crud_page" ADD CONSTRAINT "FK_5c72bef897cc5272e24e835cff9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD CONSTRAINT "FK_47fe877cfbfa52e2c134a893e3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP CONSTRAINT "FK_47fe877cfbfa52e2c134a893e3b"`);
        await queryRunner.query(`ALTER TABLE "crud_page" DROP CONSTRAINT "FK_5c72bef897cc5272e24e835cff9"`);
        await queryRunner.query(`ALTER TABLE "crud_data" DROP CONSTRAINT "FK_b024725814e88e3dcdeae87ab64"`);
        await queryRunner.query(`ALTER TABLE "widget" DROP CONSTRAINT "FK_57d08c3b59060bb5ccbe439e353"`);
        await queryRunner.query(`ALTER TABLE "api_key" DROP CONSTRAINT "FK_277972f4944205eb29127f9bb6c"`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "warningCount" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "errorCount" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "averageResponseTime" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "totalRequests" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "system_metrics" ALTER COLUMN "activeUsers" SET DEFAULT '0'`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ALTER COLUMN "availableModels" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP COLUMN "selectedModel"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD "selectedModel" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ai_settings" DROP COLUMN "apiKey"`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD "apiKey" character varying NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."ai_provider_enum_old" AS ENUM('openai', 'gemini', 'anthropic')`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ALTER COLUMN "provider" TYPE "public"."ai_provider_enum_old" USING "provider"::"text"::"public"."ai_provider_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."ai_settings_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ai_provider_enum_old" RENAME TO "ai_provider_enum"`);
        await queryRunner.query(`ALTER TABLE "widget" ALTER COLUMN "config" SET DEFAULT '{}'`);
        await queryRunner.query(`CREATE TYPE "public"."widget_type_enum_old" AS ENUM('CHART', 'TABLE', 'METRIC', 'MAP', 'WEATHER', 'STATUS')`);
        await queryRunner.query(`ALTER TABLE "widget" ALTER COLUMN "type" TYPE "public"."widget_type_enum_old" USING "type"::"text"::"public"."widget_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."widget_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."widget_type_enum_old" RENAME TO "widget_type_enum"`);
        await queryRunner.query(`ALTER TABLE "api_key" DROP COLUMN "lastUsed"`);
        await queryRunner.query(`ALTER TABLE "api_key" ADD "lastUsed" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "api_key" ADD CONSTRAINT "UQ_api_key_key" UNIQUE ("key")`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD CONSTRAINT "UQ_ai_settings_provider_user" UNIQUE ("provider", "userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_system_metrics_timestamp" ON "system_metrics" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_error_log_created_at" ON "error_log" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_email" ON "user" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_crud_page_user" ON "crud_page" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_crud_data_page" ON "crud_data" ("pageId") `);
        await queryRunner.query(`CREATE INDEX "IDX_widget_user" ON "widget" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_api_key_user" ON "api_key" ("userId") `);
        await queryRunner.query(`ALTER TABLE "error_log" ADD CONSTRAINT "FK_error_log_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_settings" ADD CONSTRAINT "FK_ai_settings_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crud_page" ADD CONSTRAINT "FK_crud_page_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crud_data" ADD CONSTRAINT "FK_crud_data_page" FOREIGN KEY ("pageId") REFERENCES "crud_page"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "widget" ADD CONSTRAINT "FK_widget_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "api_key" ADD CONSTRAINT "FK_api_key_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
