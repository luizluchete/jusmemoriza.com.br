import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { faker } from '@faker-js/faker'
import fsExtra from 'fs-extra'
import { http, passthrough, type HttpHandler } from 'msw'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const here = (...s: Array<string>) => path.join(__dirname, ...s)

const googleUserFixturePath = path.join(
	here(
		'..',
		'fixtures',
		'google',
		`users.${process.env.VITEST_POOL_ID || 0}.local.json`,
	),
)

await fsExtra.ensureDir(path.dirname(googleUserFixturePath))

function createGoogleUser(code?: string | null) {
	code ??= faker.string.uuid()
	return {
		code,
		accessToken: `${code}_mock_access_token`,
		id: faker.string.uuid(),
		email: faker.internet.email(),
		verified_email: true,
		name: faker.person.fullName(),
		given_name: faker.person.firstName(),
		family_name: faker.person.lastName(),
		picture: faker.image.avatar(),
		locale: 'en',
	}
}

async function getGoogleUsers() {
	try {
		if (await fsExtra.pathExists(googleUserFixturePath)) {
			const json = await fsExtra.readJson(googleUserFixturePath)
			return json as Array<GoogleUser>
		}
		return []
	} catch (error) {
		console.error(error)
		return []
	}
}
export async function deleteGoogleUsers() {
	await fsExtra.remove(googleUserFixturePath)
}

async function setGoogleUsers(users: Array<GoogleUser>) {
	await fsExtra.writeJson(googleUserFixturePath, users, { spaces: 2 })
}
export async function insertGoogleUser(code?: string | null) {
	const googleUsers = await getGoogleUsers()
	let user = googleUsers.find(u => u.code === code)
	if (user) {
		Object.assign(user, createGoogleUser(code))
	} else {
		user = createGoogleUser(code)
		googleUsers.push(user)
	}
	await setGoogleUsers(googleUsers)
	return user
}
type GoogleUser = ReturnType<typeof createGoogleUser>

const passthroughGoogle =
	!process.env.GOOGLE_CLIENT_ID.startsWith('MOCK_') &&
	process.env.NODE_ENV !== 'test'
export const handlers: Array<HttpHandler> = [
	http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
		if (passthroughGoogle) return passthrough()
		const params = new URLSearchParams(await request.text())

		const code = params.get('code')
		const googleUsers = await getGoogleUsers()
		let user = googleUsers.find(u => u.code === code)
		if (!user) {
			user = await insertGoogleUser(code)
		}

		const response = new Response(
			JSON.stringify({
				access_token: user.accessToken,
				expires_in: 3600,
				token_type: 'Bearer',
			}),
			{
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
			},
		)
		return response
	}),

	http.get(
		'https://www.googleapis.com/oauth2/v3/userinfo',
		async ({ request }) => {
			if (passthroughGoogle) return passthrough()
			const accessToken = request.headers.get('authorization')?.split(' ')[1]

			const googleUsers = await getGoogleUsers()
			let user = googleUsers.find(u => u.accessToken === accessToken)

			if (!user) {
				user = await insertGoogleUser()
			}
			return new Response(
				JSON.stringify({
					sub: user.id,
					name: user.name,
					given_name: user.given_name,
					family_name: user.family_name,
					profile: user.picture,
					picture: user.picture,
					email: user.email,
					email_verified: true,
					locale: 'en',
				}),
				{
					headers: { 'content-type': 'application/x-www-form-urlencoded' },
				},
			)
		},
	),
]
