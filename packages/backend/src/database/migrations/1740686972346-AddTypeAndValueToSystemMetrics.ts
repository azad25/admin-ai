import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypeAndValueToSystemMetrics1740686972346 implements MigrationInterface {
    name = 'AddTypeAndValueToSystemMetrics1740686972346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            ADD COLUMN "type" varchar NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            ADD COLUMN "value" float NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            DROP COLUMN "value"
        `);

        await queryRunner.query(`
            ALTER TABLE "system_metrics"
            DROP COLUMN "type"
        `);
    }
}