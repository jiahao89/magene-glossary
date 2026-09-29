import path from 'node:path';
import { CMacroScanner, ScanResult } from '../scanners/c-macro-scanner';

export interface PushCommandOptions {
  dir: string;
  project?: string;
  version?: string;
  endpoint?: string;
  dryRun?: boolean;
}

/**
 * Glossa Push Command (TASK-801)
 * Scans C source directory and pushes new macros to GlossaHub backend
 */
export async function executePush(options: PushCommandOptions): Promise<ScanResult> {
  const targetDir = path.resolve(process.cwd(), options.dir);
  console.log(`\n🔍 Scanning C/C++ source tree at: ${targetDir}`);

  const scanner = new CMacroScanner();
  const scanResult = scanner.scanDirectory(targetDir);

  console.log(`📊 Scan Complete:`);
  console.log(`   • Scanned C files:    ${scanResult.totalScannedFiles}`);
  console.log(`   • Unique KW macros:   ${scanResult.extractedMacros.length}`);
  console.log(`   • Duplicates skipped: ${scanResult.duplicatesIgnored}`);

  if (options.dryRun) {
    console.log(`ℹ️ Dry run mode enabled. No network changes were submitted.`);
    return scanResult;
  }

  // If endpoint is configured, submit to server
  if (options.endpoint && scanResult.extractedMacros.length > 0) {
    console.log(`🚀 Pushing ${scanResult.extractedMacros.length} macros to ${options.endpoint}...`);
    try {
      const response = await fetch(`${options.endpoint}/api/v2/terms/batch-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: options.project || 'proj-c606',
          versionId: options.version || 'ver-2.0.0',
          macros: scanResult.extractedMacros,
        }),
      });

      if (!response.ok) {
        console.warn(`⚠️ Warning: Server responded with status ${response.status}`);
      } else {
        const data = await response.json();
        console.log(`✔ Push successful: synced ${data.created || scanResult.extractedMacros.length} terms.`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Warning: Could not reach GlossaHub backend (${e.message}). Saved local scan report.`);
    }
  }

  return scanResult;
}
