import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function packageRootDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function defaultRecipesDir(): string {
  return resolve(packageRootDir(), "references/recipes");
}
