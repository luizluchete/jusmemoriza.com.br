import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { http } from 'msw'
import { afterEach, expect, test } from 'vitest'
import { twoFAVerificationType } from '#app/routes/settings+/profile.two-factor.tsx'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { connectionSessionStorage } from '#app/utils/connections.server.ts'
import { GOOGLE_PROVIDER_NAME } from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { generateTOTP } from '#app/utils/totp.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { deleteGoogleUsers, insertGoogleUser } from '#tests/mocks/google.js'
import { server } from '#tests/mocks/index.ts'
import { consoleError } from '#tests/setup/setup-test-env.ts'
import { BASE_URL, convertSetCookieToCookie } from '#tests/utils.ts'
import { loader } from './auth.$provider.callback.ts'

const ROUTE_PATH = '/auth/google/callback'
const PARAMS = { provider: 'google' }

afterEach(async () => {
	await deleteGoogleUsers()
})

test('a new user goes to onboarding', async () => {
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} }).catch(
		e => e,
	)
	expect(response).toHaveRedirect('/onboarding/google')
})

test('when auth fails, send the user to login with a toast', async () => {
	consoleError.mockImplementation(() => {})
	server.use(
		http.post('https://oauth2.googleapis.com/token', async () => {
			return new Response('error', { status: 400 })
		}),
	)
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} }).catch(
		e => e,
	)
	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Autenticação falhou',
			description: `Ocorreu um erro ao autenticar com Google.`,
			type: 'error',
		}),
	)
	expect(consoleError).toHaveBeenCalledTimes(1)
})

test('when a user is logged in, it creates the connection', async () => {
	const googleUser = await insertGoogleUser()

	const session = await setupUser()
	const request = await setupRequest({
		sessionId: session.id,
		code: googleUser.code,
	})
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/home')
	await expect(response).toSendToast(
		expect.objectContaining({
			description: 'Login feito com sucesso utilizando o provedor Google',
			title: 'Sua conta Google foi conectada.',
			type: 'success',
		}),
	)
	const connection = await prisma.connection.findFirst({
		select: { id: true },
		where: {
			userId: session.userId,
			providerId: googleUser.id,
		},
	})
	expect(
		connection,
		'the connection was not created in the database',
	).toBeTruthy()
})

test(`when a user is logged in and has already connected, it doesn't do anything and just redirects the user back to the connections page`, async () => {
	const session = await setupUser()
	const googleUser = await insertGoogleUser()
	await prisma.connection.create({
		data: {
			providerName: GOOGLE_PROVIDER_NAME,
			userId: session.userId,
			providerId: googleUser.id.toString(),
		},
	})
	const request = await setupRequest({
		sessionId: session.id,
		code: googleUser.code,
	})
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/home')
	expect(response).toSendToast(
		expect.objectContaining({
			title: 'Já conectado!',
			description: expect.stringContaining(
				`Seu usuário Google já está conectada.`,
			),
		}),
	)
})

test('when a user exists with the same email, create connection and make session', async () => {
	const googleUser = await insertGoogleUser()
	const email = googleUser.email.toLowerCase()
	const { userId } = await setupUser({ ...createUser(), email })
	const request = await setupRequest({ code: googleUser.code })
	const response = await loader({ request, params: PARAMS, context: {} })

	expect(response).toHaveRedirect('/home')

	await expect(response).toSendToast(
		expect.objectContaining({
			type: 'message',
			description: expect.stringContaining(googleUser.name),
		}),
	)

	const connection = await prisma.connection.findFirst({
		select: { id: true },
		where: {
			userId: userId,
			providerId: googleUser.id.toString(),
		},
	})
	expect(
		connection,
		'the connection was not created in the database',
	).toBeTruthy()

	await expect(response).toHaveSessionForUser(userId)
})

test('gives an error if the account is already connected to another user', async () => {
	const googleUser = await insertGoogleUser()
	await prisma.user.create({
		data: {
			...createUser(),
			connections: {
				create: {
					providerName: GOOGLE_PROVIDER_NAME,
					providerId: googleUser.id.toString(),
				},
			},
		},
	})
	const session = await setupUser()
	const request = await setupRequest({
		sessionId: session.id,
		code: googleUser.code,
	})
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/home')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Já conectado!',
			description: expect.stringContaining(
				'Seu usuário Google já está conectada.',
			),
		}),
	)
})

test('if a user is not logged in, but the connection exists, make a session', async () => {
	const googleUser = await insertGoogleUser()
	const { userId } = await setupUser()
	await prisma.connection.create({
		data: {
			providerName: GOOGLE_PROVIDER_NAME,
			providerId: googleUser.id.toString(),
			userId,
		},
	})
	const request = await setupRequest({ code: googleUser.code })
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/home')
	await expect(response).toHaveSessionForUser(userId)
})

test('if a user is not logged in, but the connection exists and they have enabled 2FA, send them to verify their 2FA and do not make a session', async () => {
	const googleUser = await insertGoogleUser()
	const { userId } = await setupUser()
	await prisma.connection.create({
		data: {
			providerName: GOOGLE_PROVIDER_NAME,
			providerId: googleUser.id.toString(),
			userId,
		},
	})
	const { otp: _otp, ...config } = generateTOTP()
	await prisma.verification.create({
		data: {
			type: twoFAVerificationType,
			target: userId,
			...config,
		},
	})
	const request = await setupRequest({ code: googleUser.code })
	const response = await loader({ request, params: PARAMS, context: {} })
	const searchParams = new URLSearchParams({
		type: twoFAVerificationType,
		target: userId,
		redirectTo: '/home',
	})
	expect(response).toHaveRedirect(`/verify?${searchParams}`)
})

async function setupRequest({
	sessionId,
	code = faker.string.uuid(),
}: { sessionId?: string; code?: string } = {}) {
	const url = new URL(ROUTE_PATH, BASE_URL)
	const state = faker.string.uuid()
	url.searchParams.set('state', state)
	url.searchParams.set('code', code)
	const connectionSession = await connectionSessionStorage.getSession()
	connectionSession.set('oauth2:state', state)
	const authSession = await authSessionStorage.getSession()
	if (sessionId) authSession.set(sessionKey, sessionId)
	const setSessionCookieHeader =
		await authSessionStorage.commitSession(authSession)
	const setConnectionSessionCookieHeader =
		await connectionSessionStorage.commitSession(connectionSession)
	const request = new Request(url.toString(), {
		method: 'GET',
		headers: {
			cookie: [
				convertSetCookieToCookie(setConnectionSessionCookieHeader),
				convertSetCookieToCookie(setSessionCookieHeader),
			].join('; '),
		},
	})
	return request
}

async function setupUser(userData = createUser()) {
	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					...userData,
				},
			},
		},
		select: {
			id: true,
			userId: true,
		},
	})

	return session
}
