import { MigrationInterface, QueryRunner } from 'typeorm';
import { hash } from 'bcryptjs';

export class AddSystemUser1709123456799 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await hash(crypto.randomUUID(), 10);
    
    // Add system user with a fixed UUID
    await queryRunner.query(`
      INSERT INTO "user" (id, email, name, password, role)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'system@admin.ai',
        'System',
        $1,
        'ADMIN'
      )
      ON CONFLICT (id) DO NOTHING
    `, [hashedPassword]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "user"
      WHERE id = '00000000-0000-0000-0000-000000000001'
    `);
  }
} 