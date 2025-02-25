import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrudData1709123456791 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "crud_data" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pageId" uuid NOT NULL,
        "data" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crud_data" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crud_data_page" FOREIGN KEY ("pageId") 
          REFERENCES "crud_page"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_crud_data_page" ON "crud_data"("pageId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_crud_data_page"`);
    await queryRunner.query(`DROP TABLE "crud_data"`);
  }
} 