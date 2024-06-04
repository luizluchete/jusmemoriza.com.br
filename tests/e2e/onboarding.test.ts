import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { readEmail } from '#tests/mocks/utils.ts'
import { createUser, expect, test as base } from '#tests/playwright-utils.ts'

const URL_REGEX = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/
const CODE_REGEX = /Aqui está seu código de verificação: (?<code>[\d\w]+)/
function extractUrl(text: string) {
	const match = text.match(URL_REGEX)
	return match?.groups?.url
}

const test = base.extend<{
	getOnboardingData(): {
		name: string
		email: string
		password: string
	}
}>({
	getOnboardingData: async ({}, use) => {
		const userData = createUser()
		await use(() => {
			const onboardingData = {
				...userData,
				password: faker.internet.password(),
			}
			return onboardingData
		})
		await prisma.rolesOnUsers.deleteMany({
			where: { user: { email: userData.email } },
		})
		await prisma.user.deleteMany({ where: { email: userData.email } })
	},
})

test('onboarding with link', async ({ page, getOnboardingData }) => {
	const onboardingData = getOnboardingData()

	await page.goto('/')

	await page.getByRole('link', { name: /Entrar/i }).click()
	await expect(page).toHaveURL(`/login`)

	const createAccountLink = page.getByRole('link', {
		name: /Crie sua conta/i,
	})
	await createAccountLink.click()

	await expect(page).toHaveURL(`/signup`)

	const emailTextbox = page.getByRole('textbox', { name: /email/i })
	await emailTextbox.click()
	await emailTextbox.fill(onboardingData.email)

	await page.getByRole('button', { name: /Enviar/i }).click()
	await expect(
		page.getByRole('button', { name: /Enviar/i, disabled: true }),
	).toBeVisible()
	await expect(page.getByText(/Verifique seu e-mail/i)).toBeVisible()

	const email = await readEmail(onboardingData.email)
	invariant(email, 'Email not found')
	expect(email.to).toBe(onboardingData.email.toLowerCase())
	expect(email.from).toBe('suporte@jusmemoriza.com.br')
	expect(email.subject).toMatch(/Bem vindo/i)
	const onboardingUrl = extractUrl(email.text)
	invariant(onboardingUrl, 'Onboarding URL not found')
	await page.goto(onboardingUrl)

	await expect(page).toHaveURL(/\/verify/)

	await page
		.getByRole('main')
		.getByRole('button', { name: /Validar/i })
		.click()

	await expect(page).toHaveURL(`/onboarding`)

	await page.getByRole('textbox', { name: /^Nome/i }).fill(onboardingData.name)

	await page.getByLabel(/^Senha/i).fill(onboardingData.password)

	await page.getByLabel(/^Confirme sua senha/i).fill(onboardingData.password)

	await page
		.getByLabel(
			/Você concorda com nossos Termos de Serviço e Política de Privacidade?/i,
		)
		.check()

	await page.getByLabel(/Continuar conectado ?/i).check()

	await page.getByRole('button', { name: /Crie sua conta/i }).click()

	await expect(page).toHaveURL(`/home`)

	await page.getByRole('button', { name: /Sair/i }).click()
	await expect(page).toHaveURL(`/`)
})

test('onboarding with a short code', async ({ page, getOnboardingData }) => {
	const onboardingData = getOnboardingData()

	await page.goto('/signup')

	const emailTextbox = page.getByRole('textbox', { name: /Email/i })
	await emailTextbox.click()
	await emailTextbox.fill(onboardingData.email)

	await page.getByRole('button', { name: /Enviar/i }).click()
	await expect(
		page.getByRole('button', { name: /Enviar/i, disabled: true }),
	).toBeVisible()
	await expect(page.getByText(/Verifique seu e-mail/i)).toBeVisible()

	const email = await readEmail(onboardingData.email)
	invariant(email, 'Email not found')
	expect(email.to).toBe(onboardingData.email.toLowerCase())
	expect(email.from).toBe('suporte@jusmemoriza.com.br')
	expect(email.subject).toMatch(/Bem vindo/i)
	const codeMatch = email.text.match(CODE_REGEX)
	const code = codeMatch?.groups?.code
	invariant(code, 'Onboarding code not found')
	await page.getByRole('textbox', { name: /Código de verificação/i }).fill(code)
	await page.getByRole('button', { name: /Validar/i }).click()

	await expect(page).toHaveURL(`/onboarding`)
})

test('login as existing user', async ({ page, insertNewUser }) => {
	const password = faker.internet.password()
	const user = await insertNewUser({ password })
	invariant(user.name, 'User not found')
	await page.goto('/login')
	await page.getByRole('textbox', { name: /Email/i }).fill(user.email)
	await page.getByLabel(/^Senha$/i).fill(password)
	await page.getByTestId('login-button').click()
	await expect(page).toHaveURL(`/home`)
})

test('reset password with a link', async ({ page, insertNewUser }) => {
	const originalPassword = faker.internet.password()
	const user = await insertNewUser({ password: originalPassword })
	invariant(user.name, 'User name not found')
	await page.goto('/login')

	await page.getByRole('link', { name: /Esqueceu a senha/i }).click()
	await expect(page).toHaveURL('/forgot-password')

	await expect(
		page.getByRole('heading', { name: /Esqueceu sua senha/i }),
	).toBeVisible()
	await page.getByRole('textbox', { name: /email/i }).fill(user.email)
	await page.getByRole('button', { name: /Recuperar senha/i }).click()
	await expect(
		page.getByRole('button', { name: /Recuperar senha/i, disabled: true }),
	).toBeVisible()
	await expect(page.getByText(/Verifique seu e-mail/i)).toBeVisible()

	const email = await readEmail(user.email)
	invariant(email, 'Email not found')
	expect(email.subject).toMatch(/Redefinição de senha/i)
	expect(email.to).toBe(user.email.toLowerCase())
	expect(email.from).toBe('suporte@jusmemoriza.com.br')
	const resetPasswordUrl = extractUrl(email.text)
	invariant(resetPasswordUrl, 'Reset password URL not found')
	await page.goto(resetPasswordUrl)

	await expect(page).toHaveURL(/\/verify/)

	await page
		.getByRole('main')
		.getByRole('button', { name: /Validar/i })
		.click()

	await expect(page).toHaveURL(`/reset-password`)
	const newPassword = faker.internet.password()
	await page.getByLabel(/^Nova senha$/i).fill(newPassword)
	await page.getByLabel(/^Confirmar senha$/i).fill(newPassword)

	await page.getByRole('button', { name: /Redefinir senha/i }).click()
	await expect(
		page.getByRole('button', { name: /Redefinir senha/i, disabled: true }),
	).toBeVisible()

	await expect(page).toHaveURL('/login')
	await page.getByRole('textbox', { name: /email/i }).fill(user.email)
	await page.getByLabel(/^Senha$/i).fill(originalPassword)
	await page.getByTestId('login-button').click()

	await expect(page.getByText(/Email ou senha incorretos/i)).toBeVisible()

	await page.getByLabel(/^Senha$/i).fill(newPassword)
	await page.getByTestId('login-button').click()

	await expect(page).toHaveURL(`/home`)
})

test('reset password with a short code', async ({ page, insertNewUser }) => {
	const user = await insertNewUser()
	await page.goto('/login')

	await page.getByRole('link', { name: /Esqueceu a senha/i }).click()
	await expect(page).toHaveURL('/forgot-password')

	await expect(
		page.getByRole('heading', { name: /Esqueceu sua senha/i }),
	).toBeVisible()
	await page.getByRole('textbox', { name: /email/i }).fill(user.email)
	await page.getByRole('button', { name: /Recuperar senha/i }).click()
	await expect(
		page.getByRole('button', { name: /Recuperar senha/i, disabled: true }),
	).toBeVisible()
	await expect(page.getByText(/Verifique seu e-mail/i)).toBeVisible()

	const email = await readEmail(user.email)
	invariant(email, 'Email not found')
	expect(email.subject).toMatch(/Redefinição de senha/i)
	expect(email.to).toBe(user.email)
	expect(email.from).toBe('suporte@jusmemoriza.com.br')
	const codeMatch = email.text.match(CODE_REGEX)
	const code = codeMatch?.groups?.code
	invariant(code, 'Reset Password code not found')
	await page.getByRole('textbox', { name: /Código/i }).fill(code)
	await page.getByRole('button', { name: /Validar/i }).click()

	await expect(page).toHaveURL(`/reset-password`)
})
