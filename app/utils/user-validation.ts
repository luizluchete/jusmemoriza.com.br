import { z } from 'zod'

export const UsernameSchema = z
	.string({ required_error: 'Username is required' })
	.min(3, { message: 'Username is too short' })
	.max(20, { message: 'Username is too long' })
	.regex(/^[a-zA-Z0-9_]+$/, {
		message: 'Username can only include letters, numbers, and underscores',
	})
	// users can type the username in any case, but we store it in lowercase
	.transform(value => value.toLowerCase())

export const PasswordSchema = z
	.string({ required_error: 'Senha é obrigatória' })
	.min(6, { message: 'Senha curta demais(min. 6)' })
	.max(100, { message: 'Senha muito longa(max 100)' })
export const NameSchema = z
	.string({ required_error: 'Name is required' })
	.min(3, { message: 'Name is too short' })
	.max(40, { message: 'Name is too long' })

export const EmailSchema = z
	.string({ required_error: 'Email é obrigatório' })
	.email({ message: 'Email inválido' })
	.min(3, { message: 'Email curto' })
	.max(100, { message: 'Email muito longo' })
	// users can type the email in any case, but we store it in lowercase
	.transform(value => value.toLowerCase())

export const PasswordAndConfirmPasswordSchema = z
	.object({ password: PasswordSchema, confirmPassword: PasswordSchema })
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				path: ['confirmPassword'],
				code: 'custom',
				message: 'The passwords must match',
			})
		}
	})
