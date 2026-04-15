import { describe, it, expect } from 'vitest';
import { validators } from './ipc-validator';

describe('validators.string', () => {
    it('should validate standard string', () => {
        const validate = validators.string();
        expect(validate('hello')).toBe('hello');
    });

    it('should throw if value is not a string', () => {
        const validate = validators.string();
        expect(() => validate(123)).toThrow('Expected string, got number');
        expect(() => validate(null)).toThrow('Expected string, got object');
        expect(() => validate(undefined)).toThrow('Expected string, got undefined');
        expect(() => validate({})).toThrow('Expected string, got object');
    });

    it('should enforce minLength', () => {
        const validate = validators.string({ minLength: 3 });
        expect(validate('abc')).toBe('abc');
        expect(() => validate('ab')).toThrow('String must be at least 3 characters');
    });

    it('should enforce maxLength', () => {
        const validate = validators.string({ maxLength: 5 });
        expect(validate('abcde')).toBe('abcde');
        expect(() => validate('abcdef')).toThrow('String cannot exceed 5 characters');
    });

    it('should match pattern', () => {
        const validate = validators.string({ pattern: /^[a-z]+$/ });
        expect(validate('abc')).toBe('abc');
        expect(() => validate('abc1')).toThrow('String does not match required pattern');
    });

    it('should handle allowEmpty', () => {
        const validateFalse = validators.string({ allowEmpty: false });
        expect(() => validateFalse('')).toThrow('String cannot be empty');

        const validateTrue = validators.string({ allowEmpty: true });
        expect(validateTrue('')).toBe('');
    });

    it('should sanitize string by default', () => {
        const validate = validators.string();
        expect(validate('  hello  ')).toBe('hello'); // trims
        expect(validate('hello\x00')).toBe('hello'); // removes null byte
    });

    it('should not sanitize if sanitize is false', () => {
        const validate = validators.string({ sanitize: false });
        expect(validate('  hello  ')).toBe('  hello  ');
        expect(validate('hello\x00')).toBe('hello\x00');
    });
});
