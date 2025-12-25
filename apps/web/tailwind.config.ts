import type { Config } from "tailwindcss"
import uiConfig from "@taskly/ui/tailwind.config"

const config = {
  ...uiConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config

export default config

