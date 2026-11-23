import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserMatchQuery } from '../app/dtos/user/user-match.query';

const parse = (query: Record<string, unknown>) =>
  plainToInstance(UserMatchQuery, { genreId: '35', pageNumber: '0', ...query });

describe('UserMatchQuery', () => {
  it('accepts a single e-mail, which Express delivers as a plain string', async () => {
    const query = parse({ mailOfUsers: 'anna@example.com' });

    expect(query.mailOfUsers).toEqual(['anna@example.com']);
    expect(await validate(query)).toHaveLength(0);
  });

  it('accepts several e-mails', async () => {
    const query = parse({
      mailOfUsers: ['anna@example.com', 'bob@example.com'],
    });

    expect(query.mailOfUsers).toEqual(['anna@example.com', 'bob@example.com']);
    expect(await validate(query)).toHaveLength(0);
  });

  it('rejects a request without e-mails', async () => {
    const errors = await validate(parse({}));

    expect(errors.some(error => error.property === 'mailOfUsers')).toBe(true);
  });
});
