import os from "os";
import path from "path"

export const ROOT_DIR = path.join(os.homedir(), ".open-codeium")
export const CONFIG_FILE = path.join(ROOT_DIR, "config.json")
export const CACHE_DIR = path.join(ROOT_DIR, "cache")
