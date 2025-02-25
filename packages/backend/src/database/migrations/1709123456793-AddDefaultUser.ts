import { MigrationInterface, QueryRunner } from 'typeorm';
import { hash } from 'bcryptjs';

export class AddDefaultUser1709123456793 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only add default user in development
    if (process.env.NODE_ENV === 'development') {
      const hashedPassword = await hash('admin123', 10);
      
      // First check if the user exists
      const existingUser = await queryRunner.query(`
        SELECT id FROM "user" WHERE id = '00000000-0000-0000-0000-000000000000'
      `);

      if (!existingUser || existingUser.length === 0) {
        await queryRunner.query(`
          INSERT INTO "user" ("id", "email", "name", "password", "role")
          VALUES (
            '00000000-0000-0000-0000-000000000000',
            'dev@example.com',
            'Development User',
            $1,
            'ADMIN'
          )
        `, [hashedPassword]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      await queryRunner.query(`
        DELETE FROM "user"
        WHERE id = '00000000-0000-0000-0000-000000000000'
      `);
    }
  }
} 