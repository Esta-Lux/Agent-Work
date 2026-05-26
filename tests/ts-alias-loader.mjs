import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hook = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "ts-alias-hook.mjs"));
register(hook.href, import.meta.url);
