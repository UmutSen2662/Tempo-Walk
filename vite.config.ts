import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        svelte(),
        VitePWA({
            registerType: "autoUpdate",
            injectRegister: "auto",
            manifest: {
                name: "Tempo Walk",
                short_name: "Tempo Walk",
                start_url: "./tempo-walk",
                display: "standalone",
                background_color: "#222",
                theme_color: "#66bb6a",
                scope: "./tempo-walk",
                icons: [
                    {
                        src: "./pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "./pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "./pwa-maskable-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "maskable",
                    },
                    {
                        src: "./pwa-maskable-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
                screenshots: [
                    {
                        src: "./screenshot-1.png",
                        sizes: "400x840",
                        type: "image/png",
                    },
                    {
                        src: "./screenshot-2.png",
                        sizes: "1280x720",
                        type: "image/png",
                        form_factor: "wide",
                    },
                ],
                description: "Tempo Walk - A timer for interval walking",
                id: "./tempo-walk",
                launch_handler: {
                    client_mode: "auto",
                },
                orientation: "portrait",
                display_override: ["window-controls-overlay", "standalone", "browser"],
                categories: ["fitness", "health"],
                dir: "ltr",
                lang: "en",
            },
        }),
    ],
    build: {
        target: "esnext", // Enables modern JavaScript features
        outDir: "docs",
    },
});
