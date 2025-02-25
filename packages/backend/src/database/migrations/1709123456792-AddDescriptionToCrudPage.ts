import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDescriptionToCrudPage1709123456792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "crud_page"
      ADD COLUMN "description" character varying NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "crud_page"
      DROP COLUMN "description"
    `);
  }
} 