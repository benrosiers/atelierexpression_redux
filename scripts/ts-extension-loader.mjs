// Minimal resolve hook so validate-content.mjs can import src/data/*.ts files that import each
// other without file extensions (the codebase's normal, Vite/TS-idiomatic style — e.g.
// `import { nextWorkshop } from './nextWorkshop'`). Node's native ESM resolver requires
// extensions and has no bundler-style fallback, so this hook retries unresolved relative
// specifiers with a `.ts` suffix before giving up. Scoped to this validation script only —
// nothing about the actual site build depends on this.

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && (specifier.startsWith('./') || specifier.startsWith('../'))) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
