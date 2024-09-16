import { createCookieSessionStorage } from '@remix-run/node'

export const storageSession = createCookieSessionStorage({
	cookie: {
		name: 'en_storageSession',
		sameSite: 'lax', // CSRF protection is advised if changing to 'none'
		path: '/',
		httpOnly: true,
		maxAge: 60 * 60 * 24, // 24 hours
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})
