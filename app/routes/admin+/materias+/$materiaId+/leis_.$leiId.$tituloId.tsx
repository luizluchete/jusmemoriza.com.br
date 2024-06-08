import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	Outlet,
	useActionData,
	useLoaderData,
	useNavigation,
	useParams,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { Field } from '#app/components/forms'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button.js'
import { prisma } from '#app/utils/db.server'
import { useIsPending } from '#app/utils/misc'

const schemaAddCapitulo = z.object({
	id: z.string().optional(),
	name: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }).trim(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	const tituloId = params.tituloId
	invariantResponse(tituloId, 'Not found', { status: 404 })
	const titulo = await prisma.titulo.findUnique({
		where: { id: tituloId },
		include: { capitulos: true },
	})
	invariantResponse(titulo, 'Not found', { status: 404 })
	return json({ titulo })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const tituloId = params.tituloId
	invariantResponse(tituloId, 'Not found', { status: 404 })
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: schemaAddCapitulo })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { name, id } = submission.value
	await prisma.capitulo.upsert({
		where: { id: id ?? '__newCapitulo__' },
		create: { name, status: true, tituloId },
		update: { name },
	})

	return json(null)
}
export default function () {
	const { titulo } = useLoaderData<typeof loader>()
	const params = useParams()

	const formRef = useRef<HTMLFormElement>(null)

	const transition = useNavigation()
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()
	const isAdding = transition.state === 'submitting'
	const [form, fields] = useForm({
		id: 'form-addCapitulo',
		constraint: getZodConstraint(schemaAddCapitulo),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: schemaAddCapitulo })
		},
		shouldRevalidate: 'onBlur',
	})
	useEffect(() => {
		if (!isAdding) {
			formRef.current?.reset()
		}
	}, [isAdding])
	return (
		<div className="mt-5 flex w-full" id="capitulos">
			<div className="w-1/2 p-2">
				<h1 className="text-center text-2xl font-bold">CAPÍTULOS</h1>
				<Form
					className="mb-1 flex space-x-2"
					method="post"
					{...getFormProps(form)}
					ref={formRef}
				>
					<Field
						labelProps={{}}
						inputProps={{
							placeholder: 'Nome do Capítulo',
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
						Adicionar capítulo
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

										<th
											scope="col"
											className="relative py-3.5 pl-3 pr-4 sm:pr-6"
										>
											<span className="sr-only">Edit</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{titulo.capitulos.map(capitulo => (
										<tr
											key={capitulo.id}
											className={` hover:bg-primary/10 ${
												params.capituloId === capitulo.id
													? 'bg-green-500/10'
													: ''
											}`}
										>
											<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
												{capitulo.name}
											</td>
											<td
												className={`whitespace-nowrap px-3 py-4 text-sm ${
													capitulo.status ? 'text-green-500' : 'text-red-500'
												} `}
											>
												{capitulo.status ? 'Ativo' : 'Inativo'}
											</td>

											<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
												<Link to={`${capitulo.id}`}>
													<Icon
														name={'magnifying-glass'}
														className="text-primary"
													/>
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
			<div className="w-1/2 p-2">
				<Outlet />
			</div>
		</div>
	)
}
