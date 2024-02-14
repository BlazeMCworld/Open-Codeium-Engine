import * as config from "./config.js"

export async function get() {
    const cfg = await config.get();
    return {
        ide_name: "neovim",
        ide_version: "0.9.5",
        extension_name: "vim",
        extension_version: "1.6.28",
        api_key: cfg.api_key
    }
}
