import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { Field } from '#app/components/forms'
import { StatusButton } from '#app/components/ui/status-button'
import { prisma } from '#app/utils/db.server'
import { useIsPending } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'

const configsSchema = z.object({
	id: z.string().optional(),
	notifyEmail: z.string().email(),
})
export async function loader({ request }: LoaderFunctionArgs) {
	const configs = await prisma.config.findFirst({
		select: { notifyEmail: true, id: true },
	})
	return json({ configs })
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: configsSchema })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { notifyEmail, id } = submission.value
	await prisma.config.upsert({
		where: { id: id ?? '__new__' },
		create: {
			notifyEmail,
		},
		update: {
			notifyEmail,
		},
	})

	return json(
		{ result: submission.reply() },
		{
			headers: await createToastHeaders({
				description: 'Configurações atualizadas com sucesso',
			}),
		},
	)
}
export default function Index() {
	const actionData = useActionData<typeof action>()
	const { configs } = useLoaderData<typeof loader>()
	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: `configs-form`,
		constraint: getZodConstraint(configsSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: configsSchema })
		},
		defaultValue: {
			notifyEmail: configs?.notifyEmail,
		},
		shouldRevalidate: 'onBlur',
	})
	return (
		<div className="space-y-2">
			<h1>Configurações Gerais</h1>
			<Form method="post" {...getFormProps(form)} className="w-1/2 space-y-3">
				{configs ? (
					<input type="hidden" name="id" value={configs.id} hidden />
				) : null}
				<Field
					labelProps={{ children: 'Email para notificações' }}
					inputProps={{
						...getInputProps(fields.notifyEmail, { type: 'email' }),
					}}
					errors={fields.notifyEmail.errors}
				/>
				<div className="flex w-full justify-end">
					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						Atualizar
					</StatusButton>
				</div>
			</Form>
		</div>
	)
}
