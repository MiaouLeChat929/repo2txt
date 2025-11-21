// Heuristics & Framework Definitions
// See context.md for specifications
// Refactored for Smart Context System

export type FrameworkID = 'nodejs' | 'flutter' | 'python' | 'java' | 'go' | 'rust' | 'unknown';

export type PrecisionLevel = 'core' | 'standard' | 'full';

export interface FrameworkSignature {
  filename: string;
  weight: number;
}

export interface FrameworkDef {
  id: FrameworkID;
  name: string;
  signatures: FrameworkSignature[];
}

export const FRAMEWORKS: FrameworkDef[] = [
  {
    id: 'nodejs',
    name: 'Node.js / TypeScript',
    signatures: [
      { filename: 'package.json', weight: 10 }, // Primary
      { filename: 'tsconfig.json', weight: 5 },  // Secondary
    ],
  },
  {
    id: 'flutter',
    name: 'Flutter / Dart',
    signatures: [
      { filename: 'pubspec.yaml', weight: 10 }, // Primary
    ],
  },
  {
    id: 'python',
    name: 'Python',
    signatures: [
      { filename: 'requirements.txt', weight: 10 },
      { filename: 'pyproject.toml', weight: 10 },
    ],
  },
  {
    id: 'java',
    name: 'Java / Kotlin',
    signatures: [
      { filename: 'pom.xml', weight: 10 },
      { filename: 'build.gradle', weight: 10 },
    ],
  },
  {
    id: 'go',
    name: 'Go',
    signatures: [
      { filename: 'go.mod', weight: 10 },
    ],
  },
  {
    id: 'rust',
    name: 'Rust',
    signatures: [
      { filename: 'Cargo.toml', weight: 10 },
    ],
  },
  {
    id: 'unknown',
    name: 'Standard Repo',
    signatures: [],
  },
];

export interface ScopeRule {
  include: string[];
  exclude: string[];
}

export type FrameworkRules = Record<PrecisionLevel, ScopeRule>;

// Universal Exclusions
export const GLOBAL_EXCLUSIONS = [
  '.git/', '.git',
  'node_modules/',
  '.svn/', '.hg/',
  'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'pubspec.lock', 'Cargo.lock', 'go.sum', 'Gemfile.lock',
  '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg', '*.bmp', '*.webp',
  '*.exe', '*.dll', '*.so', '*.dylib', '*.class', '*.pyc', '*.o', '*.obj',
  '.DS_Store', 'Thumbs.db'
];

export const FRAMEWORK_RULES: Record<FrameworkID, FrameworkRules> = {
  nodejs: {
    core: {
      include: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
      exclude: ['tests/', 'test/', 'dist/', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    },
    standard: {
      include: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx', 'package.json', 'tsconfig.json', 'README.md'],
      exclude: ['tests/', 'test/', 'dist/', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  flutter: {
    core: {
      include: ['lib/**/*.dart'],
      exclude: ['android/', 'ios/', 'web/'],
    },
    standard: {
      include: ['lib/**/*.dart', 'pubspec.yaml', 'README.md'],
      exclude: ['android/', 'ios/', 'web/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  python: {
    core: {
      include: ['**/*.py'],
      exclude: ['venv/', '__pycache__/'],
    },
    standard: {
      include: ['**/*.py', 'requirements.txt', 'pyproject.toml', 'README.md'],
      exclude: ['venv/', '__pycache__/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  java: {
     core: { include: ['src/main/java/**/*.java'], exclude: [] },
     standard: { include: ['src/main/java/**/*.java', 'pom.xml', 'build.gradle', 'README.md'], exclude: [] },
     full: { include: ['**/*'], exclude: [] }
  },
  go: {
     core: { include: ['**/*.go'], exclude: [] },
     standard: { include: ['**/*.go', 'go.mod', 'README.md'], exclude: [] },
     full: { include: ['**/*'], exclude: [] }
  },
  rust: {
     core: { include: ['src/**/*.rs'], exclude: [] },
     standard: { include: ['src/**/*.rs', 'Cargo.toml', 'README.md'], exclude: [] },
     full: { include: ['**/*'], exclude: [] }
  },
  unknown: {
     core: { include: ['src/**/*'], exclude: [] },
     standard: { include: ['src/**/*', 'README.md'], exclude: [] },
     full: { include: ['**/*'], exclude: [] }
  },
};

/**
 * Detects the framework of a repository based on file signatures at the root.
 */
export function detectFramework(files: string[]): FrameworkID {
  const scores: Record<FrameworkID, number> = {
    nodejs: 0,
    flutter: 0,
    python: 0,
    java: 0,
    go: 0,
    rust: 0,
    unknown: 0,
  };

  const filesSet = new Set(files);

  for (const framework of FRAMEWORKS) {
    if (framework.id === 'unknown') continue;

    for (const signature of framework.signatures) {
       if (filesSet.has(signature.filename)) {
           scores[framework.id] += signature.weight;
       }
    }
  }

  let maxScore = 0;
  let bestFramework: FrameworkID = 'unknown';

  (Object.keys(scores) as FrameworkID[]).forEach(id => {
     if (scores[id] > maxScore) {
       maxScore = scores[id];
       bestFramework = id;
     }
  });

  return bestFramework;
}
