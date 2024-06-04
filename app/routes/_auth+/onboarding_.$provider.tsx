import {
	getFormProps,
	getInputProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	redirect,
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	type Params,
	Form,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	authenticator,
	sessionKey,
	signupWithConnection,
	requireAnonymous,
} from '#app/utils/auth.server.ts'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { NameSchema } from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { onboardingEmailSessionKey } from './onboarding'

export const providerIdKey = 'providerId'
export const prefilledProfileKey = 'prefilledProfile'

const SignupFormSchema = z.object({
	imageUrl: z.string().optional(),
	name: NameSchema,
	agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
		required_error:
			'Você deve concordar com os termos de serviço e a política de privacidade',
	}),
	remember: z.boolean().optional(),
	redirectTo: z.string().optional(),
})

async function requireData({
	request,
	params,
}: {
	request: Request
	params: Params
}) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	const providerId = verifySession.get(providerIdKey)
	const result = z
		.object({
			email: z.string(),
			providerName: ProviderNameSchema,
			providerId: z.string(),
		})
		.safeParse({ email, providerName: params.provider, providerId })
	if (result.success) {
		return result.data
	} else {
		console.error(result.error)
		throw redirect('/signup')
	}
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { email } = await requireData({ request, params })
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const prefilledProfile = verifySession.get(prefilledProfileKey)

	const formError = authSession.get(authenticator.sessionErrorKey)
	const hasError = typeof formError === 'string'

	return json({
		email,
		status: 'idle',
		submission: {
			status: hasError ? 'error' : undefined,
			initialValue: prefilledProfile ?? {},
			error: { '': hasError ? [formError] : [] },
		} as SubmissionResult,
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { email, providerId, providerName } = await requireData({
		request,
		params,
	})
	const formData = await request.formData()
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const submission = await parseWithZod(formData, {
		schema: SignupFormSchema.transform(async data => {
			const session = await signupWithConnection({
				...data,
				email,
				providerId,
				providerName,
			})
			return { ...data, session }
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { session, remember, redirectTo } = submission.value

	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	authSession.set(sessionKey, session.id)
	const headers = new Headers()
	headers.append(
		'set-cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	)
	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)

	return redirectWithToast(
		safeRedirect(redirectTo),
		{ title: 'Bem-vindo', description: 'Obrigado por inscrever-se!' },
		{ headers },
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Inscreva-se | JusMemoriza' }]
}

export default function SignupRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'onboarding-provider-form',
		constraint: getZodConstraint(SignupFormSchema),
		lastResult: actionData?.result ?? data.submission,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="container flex min-h-full flex-col justify-center pb-5 pt-1">
			<div className="mx-auto w-full max-w-lg">
				<div className="flex flex-col gap-3 text-center">
					<h1 className="text-h1">Bem vindo a bordo!</h1>
					<p className="text-body-md text-muted-foreground">
						Por favor, insira seus dados.
					</p>
				</div>
				<Spacer size="xs" />
				<Form
					method="POST"
					className="mx-auto min-w-full max-w-sm sm:min-w-[368px]"
					{...getFormProps(form)}
				>
					{fields.imageUrl.initialValue ? (
						<div className="mb-4 flex flex-col items-center justify-center gap-4">
							<img
								src={fields.imageUrl.initialValue}
								alt="Profile"
								className="h-24 w-24 rounded-full"
							/>
							<p className="text-body-sm text-muted-foreground">
								Você pode alterar sua foto mais tarde
							</p>
							<input {...getInputProps(fields.imageUrl, { type: 'hidden' })} />
						</div>
					) : null}

					<Field
						labelProps={{ htmlFor: fields.name.id, children: 'Nome' }}
						inputProps={{
							...getInputProps(fields.name, { type: 'text' }),
							autoComplete: 'name',
						}}
						errors={fields.name.errors}
					/>

					<CheckboxField
						labelProps={{
							htmlFor: fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
							children:
								'Você concorda com nossos Termos de Serviço e Política de Privacidade?',
						}}
						buttonProps={getInputProps(
							fields.agreeToTermsOfServiceAndPrivacyPolicy,
							{ type: 'checkbox' },
						)}
						errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
					/>
					<CheckboxField
						labelProps={{
							htmlFor: fields.remember.id,
							children: 'Continuar conectado?',
						}}
						buttonProps={getInputProps(fields.remember, { type: 'checkbox' })}
						errors={fields.remember.errors}
					/>

					{redirectTo ? (
						<input type="hidden" name="redirectTo" value={redirectTo} />
					) : null}

					<ErrorList errors={form.errors} id={form.errorId} />

					<div className="flex items-center justify-between gap-6">
						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : form.status ?? 'idle'}
							type="submit"
							disabled={isPending}
						>
							Criar conta
						</StatusButton>
					</div>
				</Form>
			</div>
		</div>
	)
}
