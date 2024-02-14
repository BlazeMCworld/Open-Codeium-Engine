import { indexes } from "./indexes.js";
import * as embeddings from "./embeddings.js";

export async function gather(contents, extension, max, chunks) {
    contents = contents.split("\n");
    let base = Array.from(await embeddings.compute(contents[0]));
    for (let i = 1; i < contents.length; i++) {
        let next = await embeddings.compute(contents[i]);
        for (let i = 0; i < base.length; i++) {
            base[i] = (base[i] + next[i]) / 2;
        }
    }
    let sorted = [];
    for (let file of indexes.keys()) {
        if (extension == null || file.split(".").pop() == extension) {
            let index = indexes.get(file);
            for (let embedding of index.embeddings) {
                let difference = 0;
                for (let i = 0; i < base.length; i++) {
                    difference += Math.abs(base[i] - embedding.data[i]);
                }
                sorted.push({
                    difference,
                    lines: index.contents,
                    line: embedding.line,
                    file: index.file
                });
                if (sorted.length > 100) {
                    sorted.sort((a, b) => a.difference - b.difference);
                    sorted = sorted.slice(0, 50);
                }
            }
        }
    }
    sorted.sort((a, b) => a.difference - b.difference);
    sorted = sorted.slice(0, 50);

    let result = [];
    let size = 0;
    for (let element of sorted) {
        let insert = "Context from " + element.file;
        for (let i = element.line; i < Math.min(element.line + chunks, element.lines.length); i++) {
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
