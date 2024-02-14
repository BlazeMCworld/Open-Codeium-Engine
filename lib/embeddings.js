import { pipeline } from "@xenova/transformers";
const model = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

let embeddingCache = [];
export async function compute(str) {
    let index = embeddingCache.findIndex(e => e.str == str);
    if (index != -1) {
        let res = embeddingCache[index];
        embeddingCache.push(embeddingCache.splice(index, 1)[0])
        return res.embedding;
    }
    let embedding = await actualCompute(str);
    embeddingCache.push({ str, embedding });
    if (embeddingCache.length > 1000) {
        embeddingCache.shift();
    }
    return embedding;
}

async function actualCompute(str) {
    const extractor = await model;
    const output = await extractor(str, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}
