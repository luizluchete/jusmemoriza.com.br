import { createId as cuid } from '@paralleldrive/cuid2'
import { redirect } from '@remix-run/react'
import { GoogleStrategy } from 'remix-auth-google'
import { connectionSessionStorage } from '../connections.server'
import { type Timings } from '../timing.server'
import { type AuthProvider } from './provider'

const shouldMock = process.env.GOOGLE_CLIENT_ID?.startsWith('MOCK_')

export class GoogleProvider implements AuthProvider {
	getAuthStrategy() {
		return new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID || '',
				clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
				callbackURL: '/auth/google/callback',
			},
			async ({ profile }) => {
				const email = profile.emails[0].value.trim().toLowerCase()
				const username = profile.displayName
				const imageUrl = profile.photos[0].value
				// Get the user data from your DB or API using the tokens and profile
				return {
					email,
					id: profile.id,
					username,
					name: profile.name.givenName,
					imageUrl,
				}
			},
		)
	}
	async handleMockAction(request: Request) {
		if (!shouldMock) return

		const connectionSession = await connectionSessionStorage.getSession(
			request.headers.get('cookie'),
		)
		const state = cuid()
		connectionSession.set('oauth2:state', state)
		const code = 'MOCK_CODE_GOOGLE_LUIZ'
		const searchParams = new URLSearchParams({ code, state })
		throw redirect(`/auth/google/callback?${searchParams}`, {
			headers: {
				'set-cookie':
					await connectionSessionStorage.commitSession(connectionSession),
			},
		})
	}

	resolveConnectionData(
		providerId: string,
		{ timings }: { timings?: Timings } = {},
	): Promise<{ displayName: string; link?: string | null | undefined }> {
		throw new Error('Method not implemented.')
	}
}
