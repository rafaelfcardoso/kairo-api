import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNlpFeedbackTable1741912345000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'nlp_feedback',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'task_parsing',
              'entity_extraction',
              'query_understanding',
              'intent_classification',
            ],
            default: "'task_parsing'",
          },
          {
            name: 'originalInput',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'systemOutput',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'correctedOutput',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isProcessed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'feedbackText',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'modelVersion',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'confidenceScore',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'processingTimeMs',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'relatedEntityId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'relatedEntityType',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'wasUseful',
            type: 'boolean',
            isNullable: true,
            comment:
              'Flag indicating if the NLP results were useful to the user',
          },
          {
            name: 'improvementSuggestion',
            type: 'text',
            isNullable: true,
            comment: 'User suggestions for improving the NLP system',
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create an index on user ID for faster lookups
    await queryRunner.query(`
      CREATE INDEX nlp_feedback_user_id_idx ON nlp_feedback ("userId");
    `);

    // Create an index on feedback type
    await queryRunner.query(`
      CREATE INDEX nlp_feedback_type_idx ON nlp_feedback ("type");
    `);

    // Create an index on isProcessed for easier finding of unprocessed feedback
    await queryRunner.query(`
      CREATE INDEX nlp_feedback_is_processed_idx ON nlp_feedback ("isProcessed");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices first
    await queryRunner.query(
      `DROP INDEX IF EXISTS nlp_feedback_is_processed_idx`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS nlp_feedback_type_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS nlp_feedback_user_id_idx`);

    // Then drop the table
    await queryRunner.dropTable('nlp_feedback');
  }
}
