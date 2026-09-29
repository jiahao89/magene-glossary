#!/usr/bin/env node

/**
 * GlossaHub Enterprise CLI Toolchain
 * Supports C source scanning (push) and cross-platform code generation (pull)
 */

import { executePush } from '../src/commands/push';
import { executePull } from '../src/commands/pull';

function printHelp() {
  console.log(`
Usage: glossa <command> [options]

Commands:
  push                         Scan C/C++ source code for KW macros and push to GlossaHub
    --dir=<path>               Directory containing C source files (default: .)
    --project=<id>             Target hardware project ID (default: proj-c606)
    --version=<ver>            Target firmware baseline version (default: v2.0.0)
    --dry-run                  Scan and report locally without network transmission

  pull                         Compile glossary data into native language assets
    --format=<type>            Output format: 'c-header' | 'android-xml' | 'ios-strings'
    --out=<path>               Destination output directory (default: ./generated)
    --project=<id>             Project ID
    --version=<ver>            Version tag

Examples:
  glossa push --dir=./firmware/src
  glossa pull --format=c-header --out=./firmware/generated
  glossa pull --format=android-xml --out=./android/app/src/main
  glossa pull --format=ios-strings --out=./ios/MageneApp
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  // Parse key-value arguments
  const options: Record<string, string | boolean> = {};
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--')) {
      const parts = arg.substring(2).split('=');
      const key = parts[0];
      const val = parts.length > 1 ? parts.slice(1).join('=') : true;
      options[key] = val;
    }
  }

  if (command === 'push') {
    const dir = (options['dir'] as string) || '.';
    const project = (options['project'] as string) || 'proj-c606';
    const version = (options['version'] as string) || 'v2.0.0';
    const dryRun = Boolean(options['dry-run']);

    await executePush({ dir, project, version, dryRun });
    process.exit(0);
  } else if (command === 'pull') {
    const format = (options['format'] as any) || 'c-header';
    const out = (options['out'] as string) || './generated';
    const project = (options['project'] as string) || 'proj-c606';
    const version = (options['version'] as string) || 'v2.0.0';

    await executePull({ format, out, project, version });
    process.exit(0);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
