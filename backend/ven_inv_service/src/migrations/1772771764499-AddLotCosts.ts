import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLotCosts1772771764499 implements MigrationInterface {
  name = 'AddLotCosts1772771764499';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vendors" DROP COLUMN "currency"`);
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "transportation_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "documentation_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "shipping_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "ground_field_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "certification_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "labour_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "manager_id" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "manager_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "labour_cost"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "certification_cost"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "ground_field_cost"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "shipping_cost"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "documentation_cost"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "transportation_cost"`);
    await queryRunner.query(
      `ALTER TABLE "vendors" ADD "currency" character varying(10) NOT NULL DEFAULT 'QAR'`,
    );
  }
}
