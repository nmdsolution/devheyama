import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindObjectsQueryDto } from './find-objects-query.dto';

async function validateQuery(payload: Record<string, unknown>) {
  const instance = plainToInstance(FindObjectsQueryDto, payload, {
    // Mirrors the global ValidationPipe's transform option, and matches
    // how NestJS actually decodes raw (string-typed) query params.
    enableImplicitConversion: false,
  });
  return { instance, errors: await validate(instance) };
}

describe('FindObjectsQueryDto', () => {
  it('defaults page and limit when neither is provided', async () => {
    const { instance, errors } = await validateQuery({});

    expect(errors).toHaveLength(0);
    expect(instance.page).toBe(1);
    expect(instance.limit).toBe(12);
  });

  it('accepts a valid page/limit combination', async () => {
    const { errors } = await validateQuery({ page: '3', limit: '20' });

    expect(errors).toHaveLength(0);
  });

  it('rejects page=0', async () => {
    const { errors } = await validateQuery({ page: '0' });

    const pageError = errors.find((error) => error.property === 'page');
    expect(pageError).toBeDefined();
    expect(pageError?.constraints).toHaveProperty('min');
  });

  it('rejects a negative page', async () => {
    const { errors } = await validateQuery({ page: '-1' });

    const pageError = errors.find((error) => error.property === 'page');
    expect(pageError).toBeDefined();
    expect(pageError?.constraints).toHaveProperty('min');
  });

  it('rejects a non-numeric page', async () => {
    const { errors } = await validateQuery({ page: 'abc' });

    const pageError = errors.find((error) => error.property === 'page');
    expect(pageError).toBeDefined();
    expect(pageError?.constraints).toHaveProperty('isInt');
  });

  it('rejects a limit above the 100 cap', async () => {
    const { errors } = await validateQuery({ limit: '1000' });

    const limitError = errors.find((error) => error.property === 'limit');
    expect(limitError).toBeDefined();
    expect(limitError?.constraints).toHaveProperty('max');
  });

  it('accepts limit at exactly the 100 cap (boundary)', async () => {
    const { errors } = await validateQuery({ limit: '100' });

    expect(errors).toHaveLength(0);
  });

  it('rejects limit=0', async () => {
    const { errors } = await validateQuery({ limit: '0' });

    const limitError = errors.find((error) => error.property === 'limit');
    expect(limitError).toBeDefined();
    expect(limitError?.constraints).toHaveProperty('min');
  });
});
