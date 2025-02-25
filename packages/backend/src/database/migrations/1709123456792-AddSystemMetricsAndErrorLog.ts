import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemMetricsAndErrorLog1709123456792 implements MigrationInterface {
    name = 'AddSystemMetricsAndErrorLog1709123456792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "error_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "message" text NOT NULL,
                "stack" text,
                "path" text,
                "method" text,
                "userId" uuid,
                "userAgent" text,
                "ip" text,
                "location" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_error_log" PRIMARY KEY ("id"),
                CONSTRAINT "FK_error_log_user" FOREIGN KEY ("userId") 
                  REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "system_metrics" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "cpuUsage" float NOT NULL,
                "memoryUsage" float NOT NULL,
                "activeUsers" integer NOT NULL DEFAULT 0,
                "totalRequests" integer NOT NULL DEFAULT 0,
                "averageResponseTime" float NOT NULL DEFAULT 0,
                "topPaths" jsonb NOT NULL DEFAULT '[]',
                "locationStats" jsonb NOT NULL DEFAULT '{}',
                "errorCount" integer NOT NULL DEFAULT 0,
                "warningCount" integer NOT NULL DEFAULT 0,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_system_metrics" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_error_log_created_at" ON "error_log"("createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_system_metrics_timestamp" ON "system_metrics"("timestamp")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_system_metrics_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_error_log_created_at"`);
        await queryRunner.query(`DROP TABLE "system_metrics"`);
        await queryRunner.query(`DROP TABLE "error_log"`);
    }
} 