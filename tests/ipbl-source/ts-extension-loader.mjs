export async function resolve(specifier, context, nextResolve) {
  const local = specifier.startsWith("../src/") || specifier.startsWith("../../src/") || specifier.startsWith("./") || specifier.startsWith("../");
  if (local && specifier.endsWith(".js")) {
    try {
      return await nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    } catch (_error) {
      return nextResolve(specifier, context);
    }
  }
  if (local && !specifier.match(/\.[cm]?[jt]sx?$/)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch (_error) {
      return nextResolve(specifier, context);
    }
  }
  return nextResolve(specifier, context);
}
