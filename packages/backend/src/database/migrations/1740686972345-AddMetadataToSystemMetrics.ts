import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataToSystemMetrics1740686972345 implements MigrationInterface {
    name = 'AddMetadataToSystemMetrics1740686972345'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            ADD COLUMN "metadata" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            DROP COLUMN "metadata"
        `);
    }
}
