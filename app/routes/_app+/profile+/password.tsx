import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, json, redirect, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { Field, ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { StatusButton } from '#app/components/ui/status-button'
import {
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useIsPending } from '#app/utils/misc'
import { redirectWithToast } from '#app/utils/toast.server'
import { PasswordSchema } from '#app/utils/user-validation'

const ChangePasswordForm = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmNewPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				path: ['confirmNewPassword'],
				code: z.ZodIssueCode.custom,
				message: 'As senhas não coincidem',
			})
		}
	})

async function requirePassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})
	if (!password) {
		throw redirect('/profile/password/create')
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	await requirePassword(userId)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	await requirePassword(userId)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ChangePasswordForm.superRefine(
			async ({ currentPassword, newPassword }, ctx) => {
				if (currentPassword && newPassword) {
					const user = await verifyUserPassword({ id: userId }, currentPassword)
					if (!user) {
						ctx.addIssue({
							path: ['currentPassword'],
							code: z.ZodIssueCode.custom,
							message: 'Senha incorreta.',
						})
					}
				}
			},
		),
	})
	if (submission.status !== 'success') {
		return json(
			{
				result: submission.reply({
					hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { newPassword } = submission.value

	await prisma.user.update({
		select: { email: true },
		where: { id: userId },
		data: {
			password: {
				update: {
					hash: await getPasswordHash(newPassword),
				},
			},
		},
	})

	return redirectWithToast(
		`/profile`,
		{
			type: 'success',
			title: 'Senha alterada',
			description: 'Sua senha foi alterada.',
		},
		{ status: 302 },
	)
}

export default function Password() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: 'password-change-form',
		constraint: getZodConstraint(ChangePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangePasswordForm })
		},
		shouldRevalidate: 'onBlur',
	})
	return (
		<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
			<Field
				labelProps={{ children: 'Senha atual' }}
				inputProps={{
					...getInputProps(fields.currentPassword, { type: 'password' }),
					autoComplete: 'current-password',
				}}
				errors={fields.currentPassword.errors}
			/>
			<Field
				labelProps={{ children: 'Nova senha' }}
				inputProps={{
					...getInputProps(fields.newPassword, { type: 'password' }),
					autoComplete: 'new-password',
				}}
				errors={fields.newPassword.errors}
			/>
			<Field
				labelProps={{ children: 'Confirmar senha' }}
				inputProps={{
					...getInputProps(fields.confirmNewPassword, {
						type: 'password',
					}),
					autoComplete: 'new-password',
				}}
				errors={fields.confirmNewPassword.errors}
			/>
			<ErrorList id={form.errorId} errors={form.errors} />
			<div className="mt-3 grid w-full grid-cols-2 gap-6">
				<Button variant="secondary" asChild>
					<Link to="/profile">Cancelar</Link>
				</Button>
				<StatusButton
					type="submit"
					status={isPending ? 'pending' : form.status ?? 'idle'}
				>
					Alterar senha
				</StatusButton>
			</div>
		</Form>
	)
}
