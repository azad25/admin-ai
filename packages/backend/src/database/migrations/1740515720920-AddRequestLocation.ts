import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequestLocation1740515720920 implements MigrationInterface {
    name = 'AddRequestLocation1740515720920'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the request_location table
        await queryRunner.query(`
            CREATE TABLE "request_location" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ip" character varying NOT NULL,
                "country" character varying NOT NULL,
                "city" character varying NOT NULL,
                "latitude" double precision NOT NULL,
                "longitude" double precision NOT NULL,
                "method" character varying NOT NULL,
                "path" character varying NOT NULL,
                "statusCode" integer NOT NULL,
                "duration" double precision NOT NULL,
                "userId" character varying,
                "requestId" character varying,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5c3e1ef10a2f9449ae10bf467ad" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the request_location table
        await queryRunner.query(`DROP TABLE "request_location"`);
    }
}
