import fs from "fs/promises";
import { existsSync } from "fs";
import { CONFIG_FILE } from "./constants.js";
import path from "path";

const config = read();

export function get() {
    return config;
}

export async function save() {
    if (!existsSync(path.dirname(CONFIG_FILE))) {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    }
    await fs.writeFile(CONFIG_FILE, JSON.stringify(await config));
}

async function read() {
    if (existsSync(CONFIG_FILE)) {
        return JSON.parse(await fs.readFile(CONFIG_FILE));
    } else {
        return {};
    }
}
