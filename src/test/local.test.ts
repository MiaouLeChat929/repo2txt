import { describe, it, expect } from 'vitest';
import { isIgnored } from '../lib/local';

describe('local.ts', () => {
    describe('isIgnored', () => {
        it('should ignore files based on exact match', () => {
            const rules = ['node_modules'];
            expect(isIgnored('node_modules/test.js', rules)).toBe(true);
        });

        it('should ignore files based on wildcard', () => {
            const rules = ['*.log'];
            expect(isIgnored('error.log', rules)).toBe(true);
            expect(isIgnored('src/error.log', rules)).toBe(true);
        });

        it('should not ignore non-matching files', () => {
            const rules = ['*.log'];
            expect(isIgnored('main.js', rules)).toBe(false);
        });
    });
});
