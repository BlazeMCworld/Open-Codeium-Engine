import { indexes } from "./indexes.js";
import * as embeddings from "./embeddings.js";

export async function gather(contents, extension, max) {
    contents = contents.split("\n");
    let base = Array.from(await embeddings.compute(contents[0]));
    for (let i = 1; i < contents.length; i++) {
        let next = await embeddings.compute(contents[i]);
        for (let i = 0; i < base.length; i++) {
            base[i] = base[i] + next[i];
        }
        let length = Math.sqrt(base.reduce((c, v) => c + v * v, 0));
        base = base.map(v => v / length);
    }
    let sorted = [];
    for (let file of indexes.keys()) {
        if (extension == null || file.split(".").pop() == extension) {
            let index = indexes.get(file);
            for (let embedding of index.embeddings) {
                let dot = 0;
                for (let i = 0; i < base.length; i++) {
                    dot += base[i] * embedding.data[i];
                }
                sorted.push({
                    similarity: dot,
                    lines: index.contents,
                    line: embedding.line,
                    file: index.file
                });
                if (sorted.length > 100) {
                    sorted.sort((a, b) => b.similarity - a.similarity);
                    sorted = sorted.slice(0, 10);
                }
            }
        }
    }
    sorted.sort((a, b) => b.similarity - a.similarity);
    sorted = sorted.slice(0, 10);

    let minV = Math.min(...sorted.map(v => v.similarity));
    let maxV = Math.max(...sorted.map(v => v.similarity));
    for (let element of sorted) {
        element.similarity = (element.similarity - minV) / (maxV - minV);
    }
    let total = sorted.reduce((c, v) => c + v.similarity, 0);
    let result = [];
    let size = 0;
    for (let element of sorted) {
        let importance = Math.min(10, 3 + element.similarity / total * max / 100);
        let insert = "Context from " + element.file;
        for (let i = element.line; i < Math.min(element.line + importance, element.lines.length); i++) {
            insert += "\n" + element.lines[i];
        }

        if (size + insert.length > max) {
            break;
        }
        result.push(insert);
        size += insert.length;
    }
    return result.reverse();
}
