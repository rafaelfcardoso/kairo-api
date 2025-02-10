import { validateSync, ValidationError } from 'class-validator';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';
import { TaskStatus, TaskPriority } from './tasks.entity';

const validationOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  skipMissingProperties: false,
  validationError: { target: false },
  stopAtFirstError: false,
};

describe('TaskDTOs', () => {
  describe('CreateTaskDto', () => {
    it('should validate a task with valid due date', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.description = 'Test Description';
      dto.priority = TaskPriority.MEDIUM;
      dto.dueDate = '2025-02-14T14:00:00.000Z';

      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBe(0);
    });

    it('should validate a task without due date', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.description = 'Test Description';
      dto.priority = TaskPriority.MEDIUM;

      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid ISO date format', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.description = 'Test Description';
      dto.dueDate = 'not-a-date'; // Completely invalid format

      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      const dateErrors = errors.find(error => error.property === 'dueDate');
      expect(dateErrors?.constraints).toHaveProperty('isIso8601');
    });

    it('should reject title shorter than 3 characters', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Ab';
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should reject title longer than 255 characters', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'A'.repeat(256);
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should reject description longer than 2000 characters', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.description = 'A'.repeat(2001);
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should reject invalid priority value', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.priority = 'invalid' as TaskPriority;
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject invalid UUID for projectId', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.projectId = 'not-a-uuid';
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });
  });

  describe('UpdateTaskDto', () => {
    it('should validate partial updates', async () => {
      const dto = new UpdateTaskDto();
      dto.title = 'Updated Task';
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBe(0);
    });

    it('should validate status update', async () => {
      const dto = new UpdateTaskDto();
      dto.status = TaskStatus.COMPLETED;
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid status value', async () => {
      const dto = new UpdateTaskDto();
      dto.status = 'invalid' as TaskStatus;
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should validate due date update', async () => {
      const dto = new UpdateTaskDto();
      dto.dueDate = '2025-02-14T14:00:00.000Z';
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid due date format in update', async () => {
      const dto = new UpdateTaskDto();
      dto.dueDate = 'not-a-date'; // Completely invalid format
      
      const errors = validateSync(dto, validationOptions);
      expect(errors.length).toBeGreaterThan(0);
      const dateErrors = errors.find(error => error.property === 'dueDate');
      expect(dateErrors?.constraints).toHaveProperty('isIso8601');
    });
  });
}); 