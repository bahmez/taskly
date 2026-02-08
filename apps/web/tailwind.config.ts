import type { Config } from "tailwindcss"
import uiConfig from "@taskly/ui/tailwind.config"
import typography from "@tailwindcss/typography"

const config = {
  ...uiConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [...(uiConfig.plugins ?? []), typography],
} satisfies Config

export default config

