import { MigrationInterface, QueryRunner } from 'typeorm';

export abstract class BaseMigration implements MigrationInterface {
  // Migration name should be set by implementing classes
  abstract name: string;

  // Abstract methods to be implemented by child classes
  protected abstract executeUp(queryRunner: QueryRunner): Promise<void>;
  protected abstract executeDown(queryRunner: QueryRunner): Promise<void>;

  // Optional method to check if migration should run
  protected async shouldRun(queryRunner: QueryRunner): Promise<boolean> {
    const migrationExists = await queryRunner.query(
      `SELECT COUNT(*) FROM migrations WHERE name = $1`,
      [this.name],
    );
    return parseInt(migrationExists[0].count) === 0;
  }

  // Wrapper for up migration with transaction and error handling
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log(`Starting migration: ${this.name}`);

    const shouldExecute = await this.shouldRun(queryRunner);
    if (!shouldExecute) {
      console.log(`Migration ${this.name} has already been applied`);
      return;
    }

    await queryRunner.startTransaction();

    try {
      console.log(`Executing up migration: ${this.name}`);
      await this.executeUp(queryRunner);

      await queryRunner.commitTransaction();
      console.log(`Successfully completed migration: ${this.name}`);
    } catch (error) {
      console.error(`Error in migration ${this.name}:`, {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  // Wrapper for down migration with transaction and error handling
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(`Starting rollback of migration: ${this.name}`);

    await queryRunner.startTransaction();

    try {
      console.log(`Executing down migration: ${this.name}`);
      await this.executeDown(queryRunner);

      await queryRunner.commitTransaction();
      console.log(`Successfully rolled back migration: ${this.name}`);
    } catch (error) {
      console.error(`Error in migration rollback ${this.name}:`, {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  // Utility method to check if a column exists
  protected async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      );
    `,
      [tableName, columnName],
    );
    return result[0].exists;
  }

  // Utility method to check if an enum type exists
  protected async enumExists(
    queryRunner: QueryRunner,
    enumName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `
      SELECT EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = $1
      );
    `,
      [enumName],
    );
    return result[0].exists;
  }

  // Utility method to check if a constraint exists
  protected async constraintExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = $1 AND constraint_name = $2
      );
    `,
      [tableName, constraintName],
    );
    return result[0].exists;
  }
}
