import { validate } from 'class-validator';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';

describe('Tag DTOs', () => {
  describe('CreateTagDto', () => {
    it('should validate a valid create tag dto', async () => {
      const dto = new CreateTagDto();
      dto.name = 'Important';
      dto.color = '#FF0000';
      dto.description = 'For important tasks';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate a create tag dto without optional fields', async () => {
      const dto = new CreateTagDto();
      dto.name = 'Important';
      dto.color = '#FF0000';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation if name is missing', async () => {
      const dto = new CreateTagDto();
      dto.color = '#FF0000';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation if color is missing', async () => {
      const dto = new CreateTagDto();
      dto.name = 'Important';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('color');
    });

    it('should fail validation if color is not a valid hex color', async () => {
      const dto = new CreateTagDto();
      dto.name = 'Important';
      dto.color = 'not-a-hex-color';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('color');
    });

    it('should validate a create tag dto with valid hex colors', async () => {
      const validColors = [
        '#FF0000',
        '#00FF00',
        '#0000FF',
        '#FFFFFF',
        '#000000',
        '#123456',
      ];

      for (const color of validColors) {
        const dto = new CreateTagDto();
        dto.name = 'Important';
        dto.color = color;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('UpdateTagDto', () => {
    it('should validate a valid update tag dto with all fields', async () => {
      const dto = new UpdateTagDto();
      dto.name = 'Updated';
      dto.color = '#00FF00';
      dto.description = 'Updated description';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate an empty update tag dto', async () => {
      const dto = new UpdateTagDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate an update tag dto with only name', async () => {
      const dto = new UpdateTagDto();
      dto.name = 'Updated';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate an update tag dto with only color', async () => {
      const dto = new UpdateTagDto();
      dto.color = '#00FF00';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate an update tag dto with only description', async () => {
      const dto = new UpdateTagDto();
      dto.description = 'Updated description';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation if color is not a valid hex color', async () => {
      const dto = new UpdateTagDto();
      dto.color = 'not-a-hex-color';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('color');
    });
  });
});
