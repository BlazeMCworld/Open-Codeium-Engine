import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import * as embeddings from "./embeddings.js";
import { CACHE_DIR } from "./constants.js"
import languages from "./languages.js";
export const indexes = new Map();

let cwd = "<unknown>";
let ignored = [];
export async function setCwd(newCwd) {
    if (cwd != newCwd) {
        cwd = newCwd;
        for (let file in indexes.keys()) {
            if (!file.startsWith(cwd)) {
                indexes.delete(file);
            }
        }
        ignored = [];
        if (existsSync(path.join(cwd, ".codeiumignore"))) {
            ignored = (await fs.readFile(path.join(cwd, ".codeiumignore")))
                .toString().split("\n")
                .filter(v => v.length > 0 && !v.startsWith("#"))
                .map(v => {
                    v = path.normalize(v.replaceAll("/", path.sep));
                    let placeholder = Math.random().toString(36).substring(2);
                    while (v.includes(placeholder)) placeholder += Math.random().toString(36).substring(2);
                    v = v.replaceAll("*", placeholder)
                        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                        .replaceAll(placeholder, ".*")
                    return new RegExp("^" + v + "$");
                })
        }
        await readIndexes();
    }
}

export function isIgnored(elm) {
    if (cwd == "<unknown>") return false;
    let rel = path.relative(cwd, elm);
    if (ignored.some(v => v.test(rel))) return true;
    let parent = path.dirname(rel);
    if (parent == "." || parent == "") return false;
    return isIgnored(path.join(cwd, parent));
}

export async function indexDir(dir) {
    if (isIgnored(dir)) return;
    let files = await fs.readdir(dir);
    for (let file of files) {
        if ((await fs.lstat(path.join(dir, file))).isDirectory()) {
            await indexDir(path.join(dir, file));
        } else {
            await indexFile(path.join(dir, file));
        }
    }
}

export async function indexFile(file) {
    if (isIgnored(file)) return;
    if (file.length == 0) return;
    if (!languages.has(file.split(".").pop())) return;
    if (!existsSync(CACHE_DIR)) {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
    const indexFile = path.join(CACHE_DIR, file.replaceAll(path.sep, "_"));
    if (!existsSync(file)) {
        if (existsSync(indexFile)) {
            await fs.unlink(indexFile);
        }
        indexes.delete(file)
        return
    }
    if (existsSync(indexFile)) {
        let originTimestamp = (await fs.stat(file)).mtimeMs;
        let indexTimestamp = (await fs.stat(indexFile)).mtimeMs;
        if (indexTimestamp > originTimestamp) {
            return;
        }
    }
    let contents = (await fs.readFile(file)).toString().split("\n");
    let newIndex = {
        file,
        contents,
        embeddings: []
    }
    indexes.set(file, newIndex);
    let base = Array.from(await embeddings.compute(file))
    for (let i = 0; i < contents.length; i++) {
        let next = await embeddings.compute(contents[i]);
        for (let i = 0; i < base.length; i++) {
            base[i] = (base[i] + next[i]) / 2;
        }
        newIndex.embeddings.push({
            line: i,
            data: Array.from(base)
        })
    }
    await fs.writeFile(indexFile, serializeIndex(newIndex))
}

async function readIndexes() {
    if (!existsSync(CACHE_DIR)) return;
    for (let file of await fs.readdir(CACHE_DIR)) {
        if (Array.from(indexes.values()).some(v => v.file.replaceAll(path.sep, "_") == file)) {
            continue;
        }
        let content = deserializeIndex(await fs.readFile(path.join(CACHE_DIR, file)));
        indexes.set(content.file, content);
    }
}

function serializeIndex(data) {
    let pieces = [];
    function intBuf(int) {
        let buf = Buffer.alloc(4);
        buf.writeInt32BE(int);
        return buf;
    }
    function floatBuf(float) {
        let buf = Buffer.alloc(4);
        buf.writeFloatBE(float);
        return buf;
    }
    pieces.push(intBuf(Buffer.from(data.file).byteLength));
    pieces.push(Buffer.from(data.file));
    pieces.push(intBuf(data.contents.length));
    for (let line of data.contents) {
        pieces.push(intBuf(Buffer.from(line).byteLength));
        pieces.push(Buffer.from(line));
    }
    pieces.push(intBuf(data.embeddings.length));
    pieces.push(intBuf(data.embeddings.length > 0 ? data.embeddings[0].data.length : 0));
    for (let embedding of data.embeddings) {
        pieces.push(intBuf(embedding.line));
        for (let float of embedding.data) {
            pieces.push(floatBuf(float));
        }
    }
    return Buffer.concat(pieces);
}

function deserializeIndex(buffer) {
    let out = {};
    let offset = 0;
    let size = buffer.readInt32BE(offset);
    offset += 4;
    out.file = buffer.subarray(offset, offset + size).toString();
    offset += size;
    let contentLines = buffer.readInt32BE(offset);
    offset += 4;
    out.contents = [];
    for (let i = 0; i < contentLines; i++) {
        size = buffer.readInt32BE(offset);
        offset += 4;
        out.contents.push(buffer.subarray(offset, offset + size).toString());
        offset += size;
    }
    let embeddingCount = buffer.readInt32BE(offset);
    offset += 4;
    let embeddingSize = buffer.readInt32BE(offset);
    offset += 4;
    out.embeddings = [];
    for (let i = 0; i < embeddingCount; i++) {
        let embedding = {};
        embedding.line = buffer.readInt32BE(offset);
        offset += 4;
        embedding.data = [];
        for (let i = 0; i < embeddingSize; i++) {
            embedding.data.push(buffer.readFloatBE(offset))
            offset += 4;
        }
        out.embeddings.push(embedding);
    }
    return out;
}

async function cleanup() {
    if (!existsSync(CACHE_DIR)) return;
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    let cutoff = Date.now() - WEEK_MS;
    for (let file of await fs.readdir(CACHE_DIR)) {
        let { atimeMs } = await fs.stat(path.join(CACHE_DIR, file));
        if (atimeMs < cutoff) {
            await fs.unlink(path.join(CACHE_DIR, file));
        }
    }
}

setTimeout(cleanup, 60000);
