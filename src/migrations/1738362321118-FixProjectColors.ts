import { MigrationInterface, QueryRunner } from 'typeorm';

const colorMappings = {
  gray: '#808080',
  blue: '#0000FF',
  black: '#000000',
};

export class FixProjectColors1738362321118 implements MigrationInterface {
  name = 'FixProjectColors1738362321118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if this migration has already been applied
    const migrationExists = await queryRunner.query(
      `SELECT COUNT(*) FROM migrations WHERE name = $1`,
      [this.name],
    );

    if (parseInt(migrationExists[0].count) > 0) {
      console.log(`Migration ${this.name} has already been applied`);
      return;
    }

    // Add # to hex colors that are missing it
    await queryRunner.query(`
      UPDATE project 
      SET color = CONCAT('#', color) 
      WHERE color ~ '^[0-9A-Fa-f]{6}$'
    `);

    // Fix named colors
    for (const [namedColor, hexColor] of Object.entries(colorMappings)) {
      await queryRunner.query(
        `
          UPDATE project 
          SET color = $1 
          WHERE LOWER(color) = LOWER($2)
        `,
        [hexColor, namedColor],
      );
    }

    // Record this migration
    await queryRunner.query(
      `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
      [1738362321118, this.name],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need for down migration as we don't want to revert to inconsistent colors
    // But we should remove the migration record
    await queryRunner.query(`DELETE FROM migrations WHERE name = $1`, [
      this.name,
    ]);
  }
}
