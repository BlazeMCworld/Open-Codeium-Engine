import https from "https";
import * as config from "./config.js";

export async function login(token, respond) {
    const req = https.request({
        hostname: "api.codeium.com",
        port: 443,
        method: "POST",
        path: "/register_user/",
        headers: {
            'Content-Type': 'application/json'
        }
    }, (res) => {
        let data = [];
        res.on("data", chunk => data.push(chunk));
        res.on("end", async () => {
            try {
                let key = JSON.parse(Buffer.concat(data)).api_key;

                if (key) {
                    const cfg = await config.get();
                    cfg.api_key = key;
                    await config.save();
                    respond("success");
                    return;
                }
            } catch (err) { }
            respond("failure");
        });
    });
    req.write(JSON.stringify({ firebase_id_token: token }));
    req.end();
}
