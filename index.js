import { createInterface } from "readline/promises";
import { randomUUID } from "crypto";
import * as completions from "./lib/completions.js";
import * as chat from "./lib/chat.js";
import * as indexes from "./lib/indexes.js";
import * as auth from "./lib/auth.js";
import * as config from "./lib/config.js"; 

(async () => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    while (true) {
        const input = JSON.parse(await rl.question(""));

        function respond(output) {
            console.log(JSON.stringify({
                id: input.id,
                data: output
            }));
        }

        handleRequest(input.data, respond).catch(err => {
            console.log(JSON.stringify({
                id: input.id,
                error: err.stack
            }));
        });
    }
})();

async function handleRequest(data, respond) {
    if (data.type == "fetch_completions") {
        await completions.fetch(data, respond);
        return;
    }

    if (data.type == "fetch_chat_message") {
        await chat.fetch(data, respond);
        return;
    }

    if (data.type == "index_file") {
        await indexes.indexFile(data.file);
        respond("ok");
        return;
    }

    if (data.type == "index_dir") {
        await indexes.indexDir(data.dir);
        respond("ok");
        return;
    }

    if (data.type == "index_cwd") {
        await indexes.setCwd(data.cwd);
        respond("ok");
        return;
    }

    if (data.type == "auth_url") {
        let uuid = randomUUID();
        respond("https://www.codeium.com/profile?response_type=token&redirect_uri=show-auth-token&state=" + uuid
            + "&scope=openid%20profile%20email&redirect_parameters_type=query");
        return;
    }

    if (data.type == "auth_login") {
        await auth.login(data.token, respond);
        return;
    }

    if (data.type == "has_auth") {
        const cfg = await config.get();
        respond(cfg.api_key != null)
        return;
    }

    throw new Error("Unknown request");
}
