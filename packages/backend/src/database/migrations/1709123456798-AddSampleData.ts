import { MigrationInterface, QueryRunner } from 'typeorm';
import { hash } from 'bcryptjs';

export class AddSampleData1709123456798 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add default admin user
    const hashedPassword = await hash('admin123', 10);
    await queryRunner.query(`
      INSERT INTO "user" (id, email, name, password, role)
      VALUES (
        uuid_generate_v4(),
        'admin@admin.ai',
        'Admin User',
        $1,
        'ADMIN'
      )
    `, [hashedPassword]);

    // Add sample CRUD pages
    await queryRunner.query(`
      INSERT INTO crud_page (id, name, endpoint, description, schema, config, "userId")
      SELECT 
        uuid_generate_v4(),
        'Products',
        'products',
        'Manage product catalog',
        '{"fields":[{"name":"name","type":"string","required":true},{"name":"price","type":"number","required":true},{"name":"description","type":"text"},{"name":"category","type":"string"}]}'::jsonb,
        '{"defaultView":"table","allowCreate":true,"allowEdit":true,"allowDelete":true}'::jsonb,
        id
      FROM "user"
      WHERE email = 'admin@admin.ai'
      LIMIT 1;
    `);

    // Add sample AI settings
    await queryRunner.query(`
      INSERT INTO ai_settings (id, provider, "apiKey", "selectedModel", "isActive", "userId")
      SELECT 
        uuid_generate_v4(),
        'openai',
        'sk-sample-key',
        'gpt-4',
        true,
        id
      FROM "user"
      WHERE email = 'admin@admin.ai'
      LIMIT 1;
    `);

    // Add sample widgets
    await queryRunner.query(`
      INSERT INTO widget (id, name, type, config, position, "userId")
      SELECT 
        uuid_generate_v4(),
        'System Health',
        'METRIC',
        '{"metric":"health","refreshInterval":30}'::jsonb,
        '{"x":0,"y":0,"w":6,"h":4}'::jsonb,
        id
      FROM "user"
      WHERE email = 'admin@admin.ai'
      LIMIT 1;
    `);

    // Add sample system metrics
    await queryRunner.query(`
      INSERT INTO system_metrics (id, "cpuUsage", "memoryUsage", "activeUsers", "totalRequests", "averageResponseTime", "topPaths", "locationStats", "errorCount", "warningCount")
      VALUES (
        uuid_generate_v4(),
        25.5,
        40.2,
        1,
        100,
        150.5,
        '[{"path":"/api/auth/login","count":50},{"path":"/api/metrics/health","count":30}]'::jsonb,
        '{"US":60,"UK":25,"DE":15}'::jsonb,
        5,
        10
      );
    `);

    // Add sample error logs
    await queryRunner.query(`
      INSERT INTO error_logs (id, message, path, method, "userAgent", ip, location, metadata)
      VALUES (
        uuid_generate_v4(),
        'Sample error message',
        '/api/sample/endpoint',
        'GET',
        'Mozilla/5.0',
        '127.0.0.1',
        '{"country":"US","city":"San Francisco","latitude":37.7749,"longitude":-122.4194}'::jsonb,
        '{"requestId":"sample-123","context":"initialization"}'::jsonb
      );
    `);

    // Add sample security events
    await queryRunner.query(`
      INSERT INTO security_events (id, type, severity, description, ip, "userAgent", metadata)
      VALUES (
        uuid_generate_v4(),
        'LOGIN_ATTEMPT',
        'info',
        'Successful login',
        '127.0.0.1',
        'Mozilla/5.0',
        '{"browser":"Chrome","os":"MacOS"}'::jsonb
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove sample data in reverse order
    await queryRunner.query(`DELETE FROM security_events`);
    await queryRunner.query(`DELETE FROM error_logs`);
    await queryRunner.query(`DELETE FROM system_metrics`);
    await queryRunner.query(`DELETE FROM widget`);
    await queryRunner.query(`DELETE FROM ai_settings`);
    await queryRunner.query(`DELETE FROM crud_page`);
    await queryRunner.query(`DELETE FROM "user" WHERE email = 'admin@admin.ai'`);
  }
} 