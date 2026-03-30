#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');
const srcDir = join(rootDir, 'src');
const logsDir = join(rootDir, 'logs');
const guardLogPath = join(logsDir, 'guards.ndjson');

const LAYERS = ['presentation', 'usecase', 'domain'];

const ALLOWED_DEPENDENCIES = {
  presentation: ['usecase'],
  usecase: ['domain'],
  domain: [],
};

function existsSync(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function getAllTsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getAllTsFilesIncludingTests(dir, files = []) {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getAllTsFilesIncludingTests(fullPath, files);
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function detectLayer(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  for (const layer of LAYERS) {
    if (normalized.includes(`/src/${layer}/`)) return layer;
  }
  return null;
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = sideEffectRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function detectImportedLayer(importPath) {
  for (const layer of LAYERS) {
    if (
      importPath.startsWith(`@/${layer}/`) ||
      importPath === `@/${layer}` ||
      importPath.includes(`/src/${layer}/`) ||
      importPath.startsWith(`../${layer}/`) ||
      importPath.startsWith(`../../${layer}/`)
    ) {
      return layer;
    }
  }
  return null;
}

/**
 * Extracts JSDoc metadata from source code before the function definition
 */
function extractJSDocMetadata(guardName) {
  const sourceCode = readFileSync(__filename, 'utf-8');

  // Find all JSDoc comments followed by functions
  const pattern = /\/\*\*([\s\S]*?)\*\/\s*function\s+(\w+)\s*\(/g;
  let match;

  while ((match = pattern.exec(sourceCode)) !== null) {
    const [, jsdocContent, functionName] = match;

    if (functionName === guardName) {
      const whatMatch = jsdocContent.match(/@what\s+(.+?)(?=\n|$)/);
      const whyMatch = jsdocContent.match(/@why\s+(.+?)(?=\n|$)/);
      const failureMatch = jsdocContent.match(/@failure\s+(.+?)(?=\n|$)/);

      return {
        what: whatMatch ? whatMatch[1].trim() : '',
        why: whyMatch ? whyMatch[1].trim() : '',
        failure: failureMatch ? failureMatch[1].trim() : '',
      };
    }
  }

  return { what: '', why: '', failure: '' };
}

/**
 * Runs a guard function with timing and logging
 */
function runGuard(guardFn) {
  const metadata = extractJSDocMetadata(guardFn.name);
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const result = guardFn();

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  const enrichedResult = {
    name: result.name,
    what: metadata.what,
    why: metadata.why,
    failure: metadata.failure,
    ok: result.ok,
    errors: result.errors,
    startedAt,
    finishedAt,
    durationMs,
  };

  // Ensure logs directory exists
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  // Append to NDJSON log
  appendFileSync(guardLogPath, JSON.stringify(enrichedResult) + '\n', 'utf-8');

  return result;
}

/**
 * @what Checks layer dependencies follow: presentation → usecase → domain
 * @why Enforces strict layered architecture with unidirectional data flow
 * @failure Layer imports from disallowed layer (e.g., presentation → domain)
 */
function checkDependencyDirection() {
  const files = getAllTsFiles(srcDir);
  const errors = [];

  for (const file of files) {
    const currentLayer = detectLayer(file);
    if (!currentLayer) continue;

    const content = readFileSync(file, 'utf-8');
    const imports = extractImports(content);

    for (const importPath of imports) {
      const importedLayer = detectImportedLayer(importPath);
      if (!importedLayer) continue;
      if (importedLayer === currentLayer) continue;

      const allowed = ALLOWED_DEPENDENCIES[currentLayer] ?? [];
      if (!allowed.includes(importedLayer)) {
        errors.push(
          `${file.replace(rootDir + '/', '')}: ${currentLayer} must not depend on ${importedLayer} (import: "${importPath}")`
        );
      }
    }
  }

  return {
    name: 'dependency-direction',
    ok: errors.length === 0,
    errors,
  };
}

/**
 * @what Checks domain layer has no external dependencies (express, etc.)
 * @why Domain layer must remain pure for testability and portability
 * @failure Domain contains imports like 'express' or other framework dependencies
 */
function checkDomainPurity() {
  const domainDir = join(srcDir, 'domain');
  if (!existsSync(domainDir)) {
    return { name: 'domain-purity', ok: true, errors: [] };
  }

  const files = getAllTsFiles(domainDir);
  const errors = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const forbiddenPatterns = [
      /from ['"]express['"]/,
      /require\(['"]express['"]\)/,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        errors.push(`${file.replace(rootDir + '/', '')}: external dependency detected`);
      }
    }
  }

  return {
    name: 'domain-purity',
    ok: errors.length === 0,
    errors,
  };
}

/**
 * @what Checks usecase layer has no external I/O dependencies
 * @why Usecase layer should orchestrate domain logic without direct I/O
 * @failure Usecase contains express, process.env, fetch, or axios
 */
function checkUsecasePurity() {
  const usecaseDir = join(srcDir, 'usecase');
  if (!existsSync(usecaseDir)) {
    return { name: 'usecase-purity', ok: true, errors: [] };
  }

  const files = getAllTsFiles(usecaseDir);
  const errors = [];

  const forbiddenPatterns = [
    { pattern: /from ['"]express['"]/, description: 'express' },
    { pattern: /require\(['"]express['"]\)/, description: 'express' },
    { pattern: /process\.env/, description: 'process.env' },
    { pattern: /from ['"]node:fetch['"]/, description: 'fetch' },
    { pattern: /\bfetch\(/, description: 'fetch' },
    { pattern: /from ['"]axios['"]/, description: 'axios' },
    { pattern: /require\(['"]axios['"]\)/, description: 'axios' },
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    for (const { pattern, description } of forbiddenPatterns) {
      if (pattern.test(content)) {
        errors.push(`${file.replace(rootDir + '/', '')}: external I/O dependency detected (${description})`);
      }
    }
  }

  return {
    name: 'usecase-purity',
    ok: errors.length === 0,
    errors,
  };
}

/**
 * @what Checks OpenAPI spec matches router implementation (bidirectional)
 * @why API contract must be in sync with actual implementation
 * @failure Route defined in OpenAPI but not implemented, or vice versa
 */
function checkOpenAPIConsistency() {
  const openapiPath = join(rootDir, 'openapi', 'openapi.yaml');
  const routerPath = join(srcDir, 'presentation', 'router.ts');

  if (!existsSync(openapiPath) || !existsSync(routerPath)) {
    return { name: 'openapi-consistency', ok: true, errors: [] };
  }

  const errors = [];

  // Parse OpenAPI
  const openapiContent = readFileSync(openapiPath, 'utf-8');
  const openapi = yaml.load(openapiContent);
  const openapiRoutes = new Set();

  if (openapi.paths) {
    for (const [path, methods] of Object.entries(openapi.paths)) {
      for (const method of Object.keys(methods)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          openapiRoutes.add(`${method.toUpperCase()} ${path}`);
        }
      }
    }
  }

  // Parse router
  const routerContent = readFileSync(routerPath, 'utf-8');
  const routerRoutes = new Set();

  // Remove single-line comments
  const cleanedContent = routerContent
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;

  let match;
  while ((match = routeRegex.exec(cleanedContent)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    routerRoutes.add(`${method} ${path}`);
  }

  // Check OpenAPI -> Router
  for (const route of openapiRoutes) {
    if (!routerRoutes.has(route)) {
      errors.push(`OpenAPI defines ${route} but it's not implemented in router`);
    }
  }

  // Check Router -> OpenAPI
  for (const route of routerRoutes) {
    if (!openapiRoutes.has(route)) {
      errors.push(`Router implements ${route} but it's not documented in OpenAPI`);
    }
  }

  return {
    name: 'openapi-consistency',
    ok: errors.length === 0,
    errors,
  };
}

/**
 * @what Checks domain layer has no non-deterministic code
 * @why Domain logic must be deterministic for reliable testing
 * @failure Domain contains Date.now(), Math.random(), or process.env
 */
function checkDomainDeterminism() {
  const domainDir = join(srcDir, 'domain');
  if (!existsSync(domainDir)) {
    return { name: 'domain-determinism', ok: true, errors: [] };
  }

  const files = getAllTsFiles(domainDir);
  const errors = [];

  const nondeterministicPatterns = [
    { pattern: /Date\.now\(\)/, description: 'Date.now()' },
    { pattern: /new Date\(\)/, description: 'new Date()' },
    { pattern: /Math\.random\(\)/, description: 'Math.random()' },
    { pattern: /process\.env/, description: 'process.env' },
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    for (const { pattern, description } of nondeterministicPatterns) {
      if (pattern.test(content)) {
        errors.push(`${file.replace(rootDir + '/', '')}: non-deterministic code detected (${description})`);
      }
    }
  }

  return {
    name: 'domain-determinism',
    ok: errors.length === 0,
    errors,
  };
}

/**
 * @what Checks codebase has no temporary workarounds or shortcuts
 * @why Prevents technical debt from accumulating in the codebase
 * @failure Code contains 'any', @ts-ignore, .skip(), .only(), or TODO temporary
 */
function checkAntiShortcut() {
  const files = getAllTsFilesIncludingTests(srcDir);
  const testFiles = getAllTsFilesIncludingTests(join(rootDir, 'tests'));
  const allFiles = [...files, ...testFiles];

  const errors = [];

  const shortcutPatterns = [
    { pattern: /:\s*any\b/, description: 'any' },
    { pattern: /@ts-ignore/, description: '@ts-ignore' },
    { pattern: /@ts-expect-error/, description: '@ts-expect-error' },
    { pattern: /\.skip\(/, description: '.skip(' },
    { pattern: /\.only\(/, description: '.only(' },
    { pattern: /TODO temporary/, description: 'TODO temporary' },
    { pattern: /FIXME temporary/, description: 'FIXME temporary' },
  ];

  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8');

    for (const { pattern, description } of shortcutPatterns) {
      if (pattern.test(content)) {
        errors.push(`${file.replace(rootDir + '/', '')}: shortcut detected (${description})`);
      }
    }
  }

  return {
    name: 'anti-shortcut',
    ok: errors.length === 0,
    errors,
  };
}

/**
 * @what Checks repository interface methods return Result<T> or Promise<Result<T>>
 * @why Enforces consistent error handling through Result type
 * @failure Repository method returns raw types like boolean, void, string, or Promise<primitive>
 */
function checkResultEnforcement() {
  const domainDir = join(srcDir, 'domain');
  if (!existsSync(domainDir)) {
    return { name: 'result-enforcement', ok: true, errors: [] };
  }

  const files = getAllTsFiles(domainDir).filter(
    file => file.includes('Repository') && file.endsWith('.ts')
  );

  const errors = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    // Extract interface methods (methods inside interface blocks)
    const interfacePattern = /interface\s+\w+Repository\s*\{([^}]+)\}/g;
    let interfaceMatch;

    while ((interfaceMatch = interfacePattern.exec(content)) !== null) {
      const interfaceBody = interfaceMatch[1];

      // Match method signatures: methodName(...): ReturnType
      const methodPattern = /(\w+)\s*\([^)]*\)\s*:\s*([^;]+);/g;
      let methodMatch;

      while ((methodMatch = methodPattern.exec(interfaceBody)) !== null) {
        const methodName = methodMatch[1];
        const returnType = methodMatch[2].trim();

        // Check if return type is Result<...> or Promise<Result<...>>
        const isValidResult =
          /^Result</.test(returnType) ||
          /^Promise<Result</.test(returnType);

        if (!isValidResult) {
          errors.push(
            `${file.replace(rootDir + '/', '')}: method '${methodName}' returns '${returnType}' instead of Result<T> or Promise<Result<T>>`
          );
        }
      }
    }
  }

  return {
    name: 'result-enforcement',
    ok: errors.length === 0,
    errors,
  };
}

const results = [
  runGuard(checkDomainPurity),
  runGuard(checkUsecasePurity),
  runGuard(checkDependencyDirection),
  runGuard(checkOpenAPIConsistency),
  runGuard(checkDomainDeterminism),
  runGuard(checkAntiShortcut),
  runGuard(checkResultEnforcement),
];

const failed = results.filter(r => !r.ok);

for (const result of results) {
  if (result.ok) {
    console.log(`✓ guard:${result.name} passed`);
  } else {
    console.error(`✗ guard:${result.name} failed`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }
}

if (failed.length > 0) {
  console.error('\n✗ Guard checks failed');
  process.exit(1);
} else {
  console.log('\n✓ All guard checks passed');
  process.exit(0);
}