import { describe, it, expect } from 'vitest';
import { applySmartFilter } from '../lib/core/smart-filter';
import { FileItem } from '../lib/file-processing';

const file = (path: string): FileItem => ({
    path,
    type: 'blob',
    url: '',
    sha: '123',
    urlType: 'github'
});

describe('smart-filter', () => {
    it('should filter Node.js core files', () => {
        const files = [
            file('package.json'),
            file('src/index.ts'),
            file('src/utils.js'),
            file('src/components/Button.tsx'),
            file('src/deep/nested/logic.ts'),
            file('tests/app.test.ts'),
            file('dist/bundle.js'),
            file('node_modules/react/index.js'),
            file('image.png')
        ];

        const { selectedFiles } = applySmartFilter(files, 'nodejs', 'core');

        expect(selectedFiles.has('src/index.ts'), 'src/index.ts should be included').toBe(true);
        expect(selectedFiles.has('src/utils.js'), 'src/utils.js should be included').toBe(true);
        expect(selectedFiles.has('src/components/Button.tsx'), 'src/components/Button.tsx should be included').toBe(true);
        expect(selectedFiles.has('src/deep/nested/logic.ts'), 'src/deep/nested/logic.ts should be included').toBe(true);

        expect(selectedFiles.has('package.json'), 'package.json should excluded in core').toBe(false);
        expect(selectedFiles.has('tests/app.test.ts'), 'tests/ should be excluded').toBe(false);
        expect(selectedFiles.has('dist/bundle.js'), 'dist/ should be excluded').toBe(false);
        expect(selectedFiles.has('node_modules/react/index.js'), 'node_modules should be excluded').toBe(false);
        expect(selectedFiles.has('image.png'), 'images should be excluded').toBe(false);
    });

    it('should filter Node.js standard files', () => {
        const files = [
            file('package.json'),
            file('src/index.ts'),
            file('README.md')
        ];
         const { selectedFiles } = applySmartFilter(files, 'nodejs', 'standard');
         expect(selectedFiles.has('package.json')).toBe(true);
         expect(selectedFiles.has('README.md')).toBe(true);
    });

    it('should filter Unknown framework files', () => {
        const files = [
            file('src/main.c'),
            file('docs/manual.pdf'),
            file('README.md')
        ];
        // unknown standard
        const { selectedFiles } = applySmartFilter(files, 'unknown', 'standard');
        expect(selectedFiles.has('src/main.c')).toBe(true);
        expect(selectedFiles.has('README.md')).toBe(true);
        expect(selectedFiles.has('docs/manual.pdf')).toBe(false); // excluded in heuristics
    });
});
