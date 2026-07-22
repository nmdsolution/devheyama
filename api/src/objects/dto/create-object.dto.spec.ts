import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateObjectDto } from './create-object.dto';

async function validateDto(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreateObjectDto, payload);
  return validate(instance);
}

describe('CreateObjectDto', () => {
  it('passes validation with a valid title and description', async () => {
    const errors = await validateDto({
      title: 'A valid title',
      description: 'A sufficiently long description.',
    });

    expect(errors).toHaveLength(0);
  });

  it('trims the title via the Transform decorator', () => {
    const instance = plainToInstance(CreateObjectDto, {
      title: '  Padded Title  ',
      description: 'A sufficiently long description.',
    });

    expect(instance.title).toBe('Padded Title');
  });

  it('rejects a title that is only whitespace (empty after trim)', async () => {
    const errors = await validateDto({
      title: '   ',
      description: 'A sufficiently long description.',
    });

    const titleError = errors.find((error) => error.property === 'title');
    expect(titleError).toBeDefined();
    expect(titleError?.constraints).toHaveProperty('isNotEmpty');
  });

  it('rejects a missing/empty title', async () => {
    const errors = await validateDto({
      title: '',
      description: 'A sufficiently long description.',
    });

    const titleError = errors.find((error) => error.property === 'title');
    expect(titleError).toBeDefined();
    expect(titleError?.constraints).toHaveProperty('isNotEmpty');
  });

  it('rejects a description shorter than 10 characters', async () => {
    const errors = await validateDto({
      title: 'A valid title',
      description: 'too short',
    });

    const descriptionError = errors.find(
      (error) => error.property === 'description',
    );
    expect(descriptionError).toBeDefined();
    expect(descriptionError?.constraints).toHaveProperty('minLength');
  });

  it('accepts a description of exactly 10 characters (boundary)', async () => {
    const errors = await validateDto({
      title: 'A valid title',
      description: '1234567890',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-string description', async () => {
    const errors = await validateDto({
      title: 'A valid title',
      description: 12345678901,
    });

    const descriptionError = errors.find(
      (error) => error.property === 'description',
    );
    expect(descriptionError).toBeDefined();
    expect(descriptionError?.constraints).toHaveProperty('isString');
  });
});
