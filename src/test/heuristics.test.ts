import { describe, it, expect } from 'vitest';
import { detectFramework } from '../lib/core/heuristics';

describe('detectFramework', () => {
  it('should detect Node.js', () => {
    const files = ['package.json', 'src/index.ts', 'README.md'];
    expect(detectFramework(files)).toBe('nodejs');
  });

  it('should detect Node.js with tsconfig', () => {
      const files = ['tsconfig.json', 'src/main.ts'];
      expect(detectFramework(files)).toBe('nodejs');
  });

  it('should detect Flutter', () => {
    const files = ['pubspec.yaml', 'lib/main.dart', 'android/'];
    expect(detectFramework(files)).toBe('flutter');
  });

  it('should detect Python', () => {
    const files = ['requirements.txt', 'main.py'];
    expect(detectFramework(files)).toBe('python');
  });

  it('should detect Java', () => {
    const files = ['pom.xml', 'src/main/java/App.java'];
    expect(detectFramework(files)).toBe('java');
  });

  it('should return unknown for empty or unmatched', () => {
      expect(detectFramework([])).toBe('unknown');
      expect(detectFramework(['random.txt'])).toBe('unknown');
  });
});
