// Heuristics & Framework Definitions
// See context.md for specifications

export type FrameworkID = 'nodejs' | 'flutter' | 'python' | 'java' | 'go' | 'rust' | 'unknown';

export interface FrameworkSignature {
  filename: string;
  weight: number;
  requires?: string[]; // e.g. 'android/' requires 'pubspec.yaml'
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
      { filename: 'package.json', weight: 10 },
      { filename: 'tsconfig.json', weight: 10 },
      { filename: 'yarn.lock', weight: 5 },
      { filename: 'package-lock.json', weight: 5 },
      { filename: 'node_modules/', weight: 5 },
      { filename: 'next.config.js', weight: 5 },
      { filename: 'vite.config.js', weight: 5 },
    ],
  },
  {
    id: 'flutter',
    name: 'Flutter / Dart',
    signatures: [
      { filename: 'pubspec.yaml', weight: 10 },
      { filename: 'pubspec.lock', weight: 5 },
      { filename: 'lib/main.dart', weight: 5 },
      // Special handling needed for folder existence checks like 'android/' with 'pubspec.yaml'
      // We will implement this logic in the detector
      { filename: 'android/', weight: 2, requires: ['pubspec.yaml'] },
      { filename: 'ios/', weight: 2, requires: ['pubspec.yaml'] },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    signatures: [
      { filename: 'requirements.txt', weight: 10 },
      { filename: 'setup.py', weight: 10 },
      { filename: 'Pipfile', weight: 10 },
      { filename: 'pyproject.toml', weight: 10 },
      { filename: 'venv/', weight: 5 },
      { filename: 'manage.py', weight: 5 },
    ],
  },
  {
    id: 'java',
    name: 'Java / Kotlin',
    signatures: [
      { filename: 'pom.xml', weight: 10 },
      { filename: 'build.gradle', weight: 10 },
      { filename: 'gradlew', weight: 5 },
    ],
  },
  {
    id: 'go',
    name: 'Go',
    signatures: [
      { filename: 'go.mod', weight: 10 },
      { filename: 'go.sum', weight: 5 },
      { filename: 'main.go', weight: 5 },
    ],
  },
  {
    id: 'rust',
    name: 'Rust',
    signatures: [
      { filename: 'Cargo.toml', weight: 10 },
      { filename: 'Cargo.lock', weight: 5 },
    ],
  },
  {
    id: 'unknown',
    name: 'Standard Repo',
    signatures: [],
  },
];

// Scope Rules
export type PrecisionLevel = 'core' | 'standard' | 'full';

export interface ScopeRule {
  include: string[];
  exclude: string[];
}

export type FrameworkRules = Record<PrecisionLevel, ScopeRule>;

// Universal Exclusions
export const GLOBAL_EXCLUSIONS = [
  '.git/',
  '.svn/',
  '.hg/',
  '.DS_Store',
  'Thumbs.db',
  'node_modules/',
  '.idea/',
  '.vscode/',
  'dist/',
  'build/',
  'coverage/',
  'tmp/',
  'temp/',
  // Images
  '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg', '*.bmp', '*.webp',
  // Binaries
  '*.exe', '*.dll', '*.so', '*.dylib', '*.class', '*.pyc', '*.o', '*.obj',
  // Archives
  '*.zip', '*.tar', '*.gz', '*.rar', '*.7z',
  // Lock files (unless Full mode specific overrides) - Handled by specific rules generally,
  // but context says "Universal Exclusions... Lock Files (Scept in Full specific)".
  // We will handle lock files in the specific logic or detailed exclusions list.
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'pubspec.lock', 'Cargo.lock', 'go.sum', 'Gemfile.lock'
];

export const FRAMEWORK_RULES: Record<FrameworkID, FrameworkRules> = {
  nodejs: {
    core: {
      include: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx', 'lib/**/*.js', 'lib/**/*.ts', 'app/**/*.js', 'app/**/*.ts'],
      exclude: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts', 'test/', 'tests/', 'e2e/', 'cypress/'],
    },
    standard: {
      include: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx', 'lib/**/*.js', 'lib/**/*.ts', 'app/**/*.js', 'app/**/*.ts', 'package.json', 'tsconfig.json', 'jsconfig.json', 'README.md', 'README.txt', 'README', 'next.config.js', 'vite.config.js', 'webpack.config.js', 'rollup.config.js'],
      exclude: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts', 'test/', 'tests/', 'e2e/', 'cypress/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  flutter: {
    core: {
      include: ['lib/**/*.dart'],
      exclude: ['lib/**/*.g.dart', 'lib/**/*.freezed.dart', 'test/', 'integration_test/', 'android/', 'ios/', 'web/', 'macos/', 'windows/', 'linux/'],
    },
    standard: {
      include: ['lib/**/*.dart', 'pubspec.yaml', 'analysis_options.yaml', 'README.md'],
      exclude: ['lib/**/*.g.dart', 'lib/**/*.freezed.dart'],
    },
    full: {
      include: ['**/*'],
      exclude: ['lib/**/*.g.dart', 'lib/**/*.freezed.dart'],
    },
  },
  python: {
    core: {
      include: ['**/*.py'],
      exclude: ['test/', 'tests/', '**/*_test.py', '**/test_*.py', 'venv/', 'env/', '.venv/', 'migrations/'],
    },
    standard: {
      include: ['**/*.py', 'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'README.md'],
      exclude: ['test/', 'tests/', '**/*_test.py', '**/test_*.py', 'venv/', 'env/', '.venv/', 'migrations/'],
    },
    full: {
      include: ['**/*'],
      exclude: [], // venv and __pycache__ are usually global exclusions or hidden folders
    },
  },
  java: {
    core: {
      include: ['src/main/java/**/*.java', 'src/main/kotlin/**/*.kt'],
      exclude: ['src/test/', 'target/'],
    },
    standard: {
      include: ['src/main/java/**/*.java', 'src/main/kotlin/**/*.kt', 'pom.xml', 'build.gradle', 'settings.gradle', 'README.md'],
      exclude: ['src/test/', 'target/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  go: {
    core: {
      include: ['**/*.go'],
      exclude: ['**/*_test.go', 'vendor/'],
    },
    standard: {
      include: ['**/*.go', 'go.mod', 'README.md'],
      exclude: ['**/*_test.go', 'vendor/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  rust: {
    core: {
      include: ['src/**/*.rs'],
      exclude: ['tests/', 'target/'],
    },
    standard: {
      include: ['src/**/*.rs', 'Cargo.toml', 'README.md'],
      exclude: ['tests/', 'target/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
  unknown: {
    core: {
      include: ['src/', 'lib/', 'app/', '**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.c', '**/*.cpp', '**/*.h', '**/*.cs', '**/*.php', '**/*.rb', '**/*.go', '**/*.rs', '**/*.swift', '**/*.kt'],
      exclude: ['test/', 'tests/', 'doc/', 'docs/'],
    },
    standard: {
      include: ['src/', 'lib/', 'app/', '**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.c', '**/*.cpp', '**/*.h', '**/*.cs', '**/*.php', '**/*.rb', '**/*.go', '**/*.rs', '**/*.swift', '**/*.kt', 'README.md', 'LICENSE', 'CONTRIBUTING.md'],
      // Note: "Files at root in uppercase" is tricky to express as a glob here, we might need logic.
      // For now hardcoding common ones.
      exclude: ['test/', 'tests/', 'doc/', 'docs/'],
    },
    full: {
      include: ['**/*'],
      exclude: [],
    },
  },
};

/**
 * Detects the framework of a repository based on file signatures at the root.
 */
export function detectFramework(rootFiles: string[]): FrameworkID {
  const scores: Record<FrameworkID, number> = {
    nodejs: 0,
    flutter: 0,
    python: 0,
    java: 0,
    go: 0,
    rust: 0,
    unknown: 0,
  };

  const filesSet = new Set(rootFiles);

  for (const framework of FRAMEWORKS) {
    if (framework.id === 'unknown') continue;

    for (const signature of framework.signatures) {
      // Check if signature exists
      // Note: Signatures can be files or directories (ending in /)
      // Our rootFiles input should contain filenames (and maybe dirnames if provided)
      // The prompt implies scanning "files at the root".

      const exists = filesSet.has(signature.filename) ||
                     (signature.filename.endsWith('/') && rootFiles.some(f => f.startsWith(signature.filename) || f === signature.filename.slice(0, -1)));

      if (exists) {
        // Check requirements
        if (signature.requires) {
           const allRequiredFound = signature.requires.every(req =>
             filesSet.has(req) || rootFiles.some(f => f.startsWith(req) || f === req.slice(0, -1))
           );
           if (allRequiredFound) {
             scores[framework.id] += signature.weight;
           }
        } else {
           scores[framework.id] += signature.weight;
        }
      }
    }
  }

  // Find max score
  let maxScore = 0;
  let bestFramework: FrameworkID = 'unknown';

  // Prioritize specific frameworks over generic ones if needed, but here we just take max score.
  // Iterate keys to find max
  (Object.keys(scores) as FrameworkID[]).forEach(id => {
     if (scores[id] > maxScore) {
       maxScore = scores[id];
       bestFramework = id;
     }
  });

  return bestFramework;
}
