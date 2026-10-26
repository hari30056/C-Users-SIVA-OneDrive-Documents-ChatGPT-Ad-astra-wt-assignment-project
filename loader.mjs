import { resolve as defaultResolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  // Try default resolution first
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const parentDir = context.parentURL ? new URL('.', context.parentURL).pathname.replace(/^\/([A-Z]:)/, '$1') : process.cwd();
      const candidates = [
        specifier + '.ts',
        specifier + '.js',
        specifier + '/index.ts',
        specifier + '/index.js',
      ];
      for (const candidate of candidates) {
        const fullPath = defaultResolve(parentDir, candidate);
        if (existsSync(fullPath)) {
          return {
            url: pathToFileURL(fullPath).href,
            shortCircuit: true,
          };
        }
      }
    }
    throw err;
  }
}
