import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

const colorMappings = {
  gray: '#808080',
  blue: '#0000FF',
  black: '#000000',
};

export class FixProjectColors1738362321118 extends BaseMigration {
  name = 'FixProjectColors1738362321118';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
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
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // No need for down migration as we don't want to revert to inconsistent colors
    console.log('No down migration needed for color fixes');
  }
}
