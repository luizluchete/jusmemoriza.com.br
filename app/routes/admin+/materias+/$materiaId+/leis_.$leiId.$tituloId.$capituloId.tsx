import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'

import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { useRef, useEffect } from 'react'
import { z } from 'zod'
import { Field } from '#app/components/forms.js'
import { StatusButton } from '#app/components/ui/status-button.js'
import { prisma } from '#app/utils/db.server'
import { useIsPending } from '#app/utils/misc.js'

const schemaAddArtigo = z.object({
	id: z.string().optional(),
	name: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }).trim(),
})
export async function loader({ request, params }: LoaderFunctionArgs) {
	const capituloId = params.capituloId
	invariantResponse(capituloId, 'Not found', { status: 404 })
	const artigos = await prisma.artigo.findMany({
		orderBy: { name: 'asc' },
		where: { capituloId },
	})
	return json({ artigos })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const capituloId = params.capituloId
	invariantResponse(capituloId, 'Not found', { status: 404 })
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: schemaAddArtigo })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { name, id } = submission.value
	await prisma.artigo.upsert({
		where: { id: id ?? '__newArtigo__' },
		create: { name, status: true, capituloId },
		update: { name },
	})

	return json(null)
}

export default function () {
	const { artigos } = useLoaderData<typeof loader>()
	const formRef = useRef<HTMLFormElement>(null)
	const transition = useNavigation()

	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()

	const isAdding = transition.state === 'submitting'

	const [form, fields] = useForm({
		id: 'form-addArtigo',
		constraint: getZodConstraint(schemaAddArtigo),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: schemaAddArtigo })
		},
		shouldRevalidate: 'onBlur',
	})

	useEffect(() => {
		if (!isAdding) {
			formRef.current?.reset()
		}
	}, [isAdding])
	return (
		<>
			<h1 className="text-center text-2xl font-bold">ARTIGOS</h1>
			<Form
				className="mb-1 flex space-x-2"
				method="post"
				{...getFormProps(form)}
				ref={formRef}
			>
				<Field
					labelProps={{}}
					inputProps={{
						placeholder: 'Nome do Artigo',
						...getInputProps(fields.name, { type: 'text' }),
					}}
					errors={fields.name.errors}
				/>
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
				>
					Adicionar Artigo
				</StatusButton>
			</Form>
			<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
				<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
					<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
						<table className="min-w-full divide-y divide-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th
										scope="col"
										className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
									>
										Nome
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{artigos.map(artigo => (
									<tr
										key={artigo.id}
										className={`} cursor-pointer  even:bg-gray-100 hover:bg-primary/10`}
									>
										<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
											{artigo.name}
										</td>
										<td
											className={`whitespace-nowrap px-3 py-4 text-sm ${
												artigo.status ? 'text-green-500' : 'text-red-500'
											} `}
										>
											{artigo.status ? 'Ativo' : 'Inativo'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</>
	)
}
