// app.config.ts
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    preset: "static"  // ← Esto genera archivos estáticos correctos
  }
});
