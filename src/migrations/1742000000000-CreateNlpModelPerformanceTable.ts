import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNlpModelPerformanceTable1742000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'nlp_model_performance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'model_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'model_version',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'operation_type',
            type: 'enum',
            enum: [
              'task_parsing',
              'entity_extraction',
              'query_understanding',
              'intent_classification',
            ],
            isNullable: false,
          },
          {
            name: 'request_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'confidence_score',
            type: 'float',
            isNullable: false,
          },
          {
            name: 'processing_time_ms',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'token_count',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'user_rated_helpful',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'required_clarification',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'performance_metrics',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
    );

    // Add indexes for faster queries
    await queryRunner.createIndex(
      'nlp_model_performance',
      new TableIndex({
        name: 'IDX_NLP_PERF_MODEL_ID',
        columnNames: ['model_id'],
      }),
    );

    await queryRunner.createIndex(
      'nlp_model_performance',
      new TableIndex({
        name: 'IDX_NLP_PERF_REQUEST_ID',
        columnNames: ['request_id'],
      }),
    );

    await queryRunner.createIndex(
      'nlp_model_performance',
      new TableIndex({
        name: 'IDX_NLP_PERF_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('nlp_model_performance');
  }
}
