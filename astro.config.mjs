import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  integrations: [
    react(),
  ],

  vite: {
    css: {
      preprocessorOptions: {
        css: {
          additionalData: `@import "./src/styles/global.css";`,
        },
      },
    },
  },

  output: "static",
  adapter: cloudflare()
});
