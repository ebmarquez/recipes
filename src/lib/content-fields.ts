import { z } from 'zod';

export const text = z.string().trim().min(1).refine(value => !/[<>\u0000-\u001f]/.test(value), 'Use plain text without HTML or control characters');
