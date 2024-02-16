import * as apiRequest from "./api-request.js";
import * as metadata from "./metadata.js";
import * as context from "./context.js"

export async function fetch(data, respond) {
    let ctx = await context.gather(data.prompt, null, 3000);
    console.warn(ctx.join("\n"));
    data.prompt = ctx.join("\n") + "\n----------\n" + data.prompt;
    await apiRequest.send("GetChatMessage", {
        metadata: await metadata.get(),
        chat_message_prompts: [{
            source: "CHAT_MESSAGE_SOURCE_USER",
            prompt: data.prompt
        }],
        prompt: data.system
    }, (chunk) => {
        if (chunk.deltaText) respond(chunk.deltaText);
    });
}
