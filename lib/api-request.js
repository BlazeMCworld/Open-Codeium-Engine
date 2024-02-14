import https from "https";

export async function send(endpoint, data, respond) {
    data = Buffer.from(JSON.stringify(data));
    let prefix = Buffer.alloc(5);
    prefix.writeInt16BE(data.byteLength, 3);

    const req = https.request({
        hostname: 'server.codeium.com',
        port: 443,
        method: 'POST',
        path: "/exa.api_server_pb.ApiServerService/" + endpoint,
        headers: {
            'Content-Type': 'application/connect+json'
        }
    }, (res) => {
        let pending = Buffer.alloc(0);
        let pendingSize = -1;
        res.on('data', function(chunk) {
            pending = Buffer.concat([pending, chunk]);
            if (pendingSize != -1) {
                if (pending.byteLength >= pendingSize) {
                    respond(JSON.parse(pending.subarray(0, pendingSize)));
                    pending = pending.subarray(pendingSize);
                    pendingSize = -1;
                } else return;
            }
            while (pending.byteLength >= 5) {
                let size = pending.readInt16BE(3);
                pending = pending.subarray(5);
                if (pending.byteLength < size) {
                    pendingSize = size;
                    return;
                }
                respond(JSON.parse(pending.subarray(0, size)));
                pending = pending.subarray(size);
            }
        });
    });

    req.write(Buffer.concat([prefix, data]));
    setTimeout(() => req.end(), 5000);
}
