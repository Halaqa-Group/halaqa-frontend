import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/composables/**/*.{js,ts}',
    './app/middleware/**/*.{js,ts}',
    './app/utils/**/*.{js,ts}',
    './app/app.vue',
    './app/app.config.ts',
    './nuxt.config.ts'
  ],
  theme: {
    extend: {
      fontFamily: {
				sans: ["Thmanyah Sans", ...defaultTheme.fontFamily.sans],
			},
      colors: {
        'primary': {
          '50': '#fbf8fb',
          '100': '#f7eff8',
          '200': '#eedfef',
          '300': '#e2c5e2',
          '400': '#d0a2cf',
          '500': '#b87db7',
          '600': '#9b5e99',
          '700': '#804c7d',
          '800': '#693f66',
          '900': '#583755',
          '950': '#361c34',
        },
        'secondary': {
          '50': '#f4f9f8',
          '100': '#daedeb',
          '200': '#b5dad8',
          '300': '#89bfbd',
          '400': '#60a1a1',
          '500': '#468586',
          '600': '#356668',
          '700': '#2f5456',
          '800': '#294446',
          '900': '#253b3c',
          '950': '#112022',
        }
      },
    }
  },
  plugins: []
} satisfies Config
