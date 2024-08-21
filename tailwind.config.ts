import { type Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import animatePlugin from 'tailwindcss-animate'
import radixPlugin from 'tailwindcss-radix'
import { marketingPreset } from './app/routes/_marketing+/tailwind-preset'
import { extendedTheme } from './app/utils/extended-theme.ts'

const backfaceVisibility = plugin(function ({ addUtilities }) {
	addUtilities({
		'.backface-visible': {
			'backface-visibility': 'visible',
		},
		'.backface-hidden': {
			'backface-visibility': 'hidden',
		},
	})
})

export default {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
	darkMode: 'class',
	theme: {
		container: {
			center: true,
			padding: '1.5rem',
			screens: {
				'2xl': '1536px',
			},
		},
		extend: extendedTheme,
	},
	presets: [marketingPreset],
	plugins: [animatePlugin, radixPlugin, backfaceVisibility],
} satisfies Config
