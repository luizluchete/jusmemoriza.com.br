import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'
import { Icon } from '#app/components/ui/icon.js'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { login, requireAnonymous } from '#app/utils/auth.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { EmailSchema, PasswordSchema } from '#app/utils/user-validation.ts'
import { handleNewSession } from './login.server.ts'

const LoginFormSchema = z.object({
	email: EmailSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
})

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	const submission = await parseWithZod(formData, {
		schema: intent =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, session: null }

				const session = await login(data)
				if (!session) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Email ou senha incorretos',
					})
					return z.NEVER
				}

				return { ...data, session }
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.session) {
		return json(
			{ result: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { session, remember, redirectTo } = submission.value

	return handleNewSession({
		request,
		session,
		remember: remember ?? false,
		redirectTo: redirectTo || '/home',
	})
}

export default function LoginPage() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getZodConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<>
			<div className="flex flex-col space-y-5">
				<h2 className="text-2xl font-bold ">Faça o login</h2>
				<form action="/auth/google" method="post">
					<button
						type="submit"
						className="flex w-full items-center justify-evenly rounded-md border border-gray-300 bg-white px-24 py-2 text-xs font-medium text-gray-500 shadow-sm hover:bg-gray-50"
					>
						<Icon name="google-logo" className="h-5 w-5" />
						Entrar com o Google
					</button>
				</form>

				<div className="relative">
					<div
						className="absolute inset-0 flex items-center"
						aria-hidden="true"
					>
						<div className="w-full border-t border-gray-300" />
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="bg-white px-2 text-gray-500">OU</span>
					</div>
				</div>
			</div>
			<Form method="post" {...getFormProps(form)}>
				<div className="">
					<HoneypotInputs />
					<Field
						labelProps={{ children: 'Email' }}
						inputProps={{
							...getInputProps(fields.email, { type: 'email' }),
							autoFocus: true,
							className: 'lowercase',
							autoComplete: 'email',
						}}
						errors={fields.email.errors}
					/>
					<Field
						labelProps={{ children: 'Senha' }}
						inputProps={{
							...getInputProps(fields.password, {
								type: 'password',
							}),
							autoComplete: 'current-password',
						}}
						errors={fields.password.errors}
					/>
					<div className="flex justify-between">
						<CheckboxField
							labelProps={{
								htmlFor: fields.remember.id,
								children: 'Continuar conectado',
							}}
							buttonProps={getInputProps(fields.remember, {
								type: 'checkbox',
							})}
							errors={fields.remember.errors}
						/>
						<div>
							<Link
								to="/forgot-password"
								className="text-body-xs font-semibold"
							>
								Esqueceu a senha?
							</Link>
						</div>
					</div>

					<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
					<ErrorList errors={form.errors} id={form.errorId} />

					<div className="flex items-center justify-between gap-6 pt-3">
						<StatusButton
							data-testid="login-button"
							className="w-full"
							status={isPending ? 'pending' : form.status ?? 'idle'}
							type="submit"
							disabled={isPending}
						>
							Entrar
						</StatusButton>
					</div>
				</div>
			</Form>
			<div className="mt-5 flex w-full items-center justify-center">
				<span className="text-sm font-normal">
					Não possui cadastro?
					<Link
						className="ml-1 font-semibold text-primary"
						to={
							redirectTo
								? `/signup?${encodeURIComponent(redirectTo)}`
								: '/signup'
						}
					>
						Crie sua conta
					</Link>
				</span>
			</div>
		</>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Login | JusMemoriza' }]
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
