import { describe, it, expect } from 'vitest';
import { detectFramework } from '@/lib/core/heuristics';

describe('Heuristics - detectFramework', () => {
  it('should detect nodejs when package.json is present', () => {
    const files = ['README.md', 'package.json', 'src/index.ts'];
    expect(detectFramework(files)).toBe('nodejs');
  });

  it('should detect flutter when pubspec.yaml is present', () => {
    const files = ['README.md', 'pubspec.yaml', 'lib/main.dart'];
    expect(detectFramework(files)).toBe('flutter');
  });

  it('should detect python when requirements.txt is present', () => {
    const files = ['app.py', 'requirements.txt', 'README.md'];
    expect(detectFramework(files)).toBe('python');
  });

  it('should detect java when pom.xml is present', () => {
    const files = ['src/main/java/App.java', 'pom.xml'];
    expect(detectFramework(files)).toBe('java');
  });

  it('should return unknown when no known signatures are present', () => {
    const files = ['README.md', 'LICENSE', 'src/something.txt'];
    expect(detectFramework(files)).toBe('unknown');
  });

  it('should prioritize nodejs over others if weights align (though currently simple checks)', () => {
      // In the current implementation, it sums weights.
      // nodejs: package.json (10)
      // python: requirements.txt (10)
      // If both present, it might depend on iteration order or logic.
      // Let's check what happens if both are present.
      // However, usually we assume one main framework.
      const files = ['package.json', 'requirements.txt'];
      // Based on iteration order in FRAMEWORKS array: nodejs comes first.
      // If scores are equal, the logic `if (scores[id] > maxScore)` means the first one setting the new max wins.
      // nodejs: 10 > 0 -> max=10, best=nodejs
      // flutter: 0
      // python: 10 > 10 is FALSE. So it stays nodejs.
      expect(detectFramework(files)).toBe('nodejs');
  });
});
