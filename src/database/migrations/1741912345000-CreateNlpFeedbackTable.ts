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
              'TASK_PARSING',
              'ENTITY_EXTRACTION',
              'QUERY_UNDERSTANDING',
              'INTENT_CLASSIFICATION',
            ],
            default: "'TASK_PARSING'",
          },
          {
            name: 'original_input',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'system_output',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'corrected_output',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_processed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'feedback_text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'model_version',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'confidence_score',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'processing_time_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'related_entity_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'related_entity_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'was_useful',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'improvement_suggestion',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('nlp_feedback');
  }
}
