import languages from "./languages.js";
import * as context from "./context.js";
import * as metadata from "./metadata.js";
import * as apiRequest from "./api-request.js";
import * as indexes from "./indexes.js"

export async function fetch(data, respond) {
    let ext = data.file.split(".").pop();
    if (indexes.isIgnored(data.file)) {
        respond({});
        return;
    }
    let lang_id = languages.get(ext);
    if (lang_id == undefined) {
        lang_id = languages.get("txt");
    }

    let ctxPrompt = data.prefix.split("\n");
    ctxPrompt.unshift(data.file);
    ctxPrompt.pop();
    let ctx = await context.gather(ctxPrompt.join("\n"), ext, 2000, 3);
    ctx = ctx.map(elm => "<|context|>" + elm + "<|endofmiddle|><|end_context|>");
    ctx = "<|suffix|><|prefix|><|middle|><|endofmiddle|>" + ctx.join("");

    if (data.prefix.length > 800) {
        data.prefix = data.prefix.substring(data.prefix.length - 800);
        let newline = data.prefix.indexOf("\n");
        if (newline != -1) {
            data.prefix = data.prefix.substring(newline + 1);
        }
    } else {
        data.prefix = "<|startoftext|><|file_info|> language " + lang_id[0] + " filename " + data.file + "\n" + data.prefix;
    }
    if (data.suffix.length > 500) {
        data.suffix = data.suffix.substring(0, 500);
        let newline = data.suffix.lastIndexOf("\n");
        if (newline != -1) {
            data.suffix = data.suffix.substring(0, newline);
        }
    } else {
        data.suffix += "<|endoftext|>"
    }
    let mode = (data.suffix.startsWith("\n") || data.suffix.length == 0) ? "<|middle|>" : "<|inline_middle|>";
    let prompt = ctx + "<|suffix|>" + data.suffix + "<|prefix|>" + data.prefix + mode;

    await apiRequest.send("GetStreamingCompletions", {
        metadata: await metadata.get(),
        request: {
            configuration: {
                num_completions: 3,
                max_tokens: 128,
                temperature: 0.4,
                first_temperature: 0.1,
                top_k: 25,
                top_p: 1
            },
            prompt,
            editor_language: lang_id[1],
        }
    }, (chunk) => {
        if (chunk && chunk.completionResponse && chunk.completionResponse.completionMap) {
            let completions = chunk.completionResponse.completionMap.completions;
            let out = {};
            for (let key of Object.keys(completions)) {
                let token = Buffer.from(completions[key].decodedToken, "base64").toString();
                if (token == "<|endofmiddle|>") continue;
                out[key] = token;
            }
            respond(out);
        }
    });
}
