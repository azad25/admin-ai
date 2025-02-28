import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToSystemMetrics1709123456793 implements MigrationInterface {
    name = 'AddUserIdToSystemMetrics1709123456793'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            ADD COLUMN "userId" uuid,
            ADD CONSTRAINT "FK_system_metrics_user" 
            FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_system_metrics_user" ON "system_metrics"("userId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_system_metrics_user"`);
        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            DROP CONSTRAINT "FK_system_metrics_user",
            DROP COLUMN "userId"
        `);
    }
} 