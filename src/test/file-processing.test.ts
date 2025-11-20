import { describe, it, expect } from 'vitest';
import { sortContents, generateOutputText } from '../lib/file-processing';

describe('file-processing.ts', () => {
    describe('sortContents', () => {
        it('should sort files alphabetically', () => {
            const files = [
                { path: 'b.js', type: 'blob' as const, url: '', urlType: 'local' as const },
                { path: 'a.js', type: 'blob' as const, url: '', urlType: 'local' as const }
            ];
            files.sort((a, b) => sortContents(a, b));
            expect(files[0].path).toBe('a.js');
            expect(files[1].path).toBe('b.js');
        });

        it('should sort directories before files (or files before directories depending on logic)', () => {
            // The logic in sortContents is a bit complex, mimicking the original behavior.
            // "Directories First" standard mentioned in memory.

            const files = [
                { path: 'src/index.js', type: 'blob' as const, url: '', urlType: 'local' as const },
                { path: 'README.md', type: 'blob' as const, url: '', urlType: 'local' as const }
            ];
            // src vs README.md
            // src is a folder (implied by path depth), README is a file.

            files.sort((a, b) => sortContents(a, b));

            // With standard directory first:
            // src/index.js should come before README.md?
            // Let's check the logic:
            // pathParts: ['src', 'index.js'] vs ['README.md']
            // i=0: 'src' vs 'README.md'. Not equal.
            // i is last for b, but not for a.
            // "if (i === bPath.length - 1 && i < aPath.length - 1) return -1;"
            // So a returns -1 (comes first?) No, return -1 means a < b, so a comes first.
            // Wait: if return -1, a comes first.
            // So 'src/index.js' comes before 'README.md'.

            expect(files[0].path).toBe('src/index.js');
        });
    });

    describe('generateOutputText', () => {
        it('should generate formatted text', () => {
            const files = [
                { path: 'test.txt', text: 'hello world', url: '' }
            ];
            const { text } = generateOutputText(files);
            expect(text).toContain('Directory Structure:');
            expect(text).toContain('test.txt');
            expect(text).toContain('hello world');
        });
    });
});
