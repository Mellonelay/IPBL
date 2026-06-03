export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("../src/") || specifier.startsWith("../../src/") || specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.match(/\.[cm]?[jt]sx?$/)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch (_error) {
      return nextResolve(specifier, context);
    }
  }
  return nextResolve(specifier, context);
}
