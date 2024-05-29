import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	Outlet,
	json,
	useActionData,
	useFetcher,
	useLoaderData,
	useNavigation,
	useParams,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { Field } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { prisma } from '#app/utils/db.server.js'
import { requireUserWithRole } from '#app/utils/permissions.server.js'

const schemaAddTitulo = z.object({
	id: z.string().optional(),
	name: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const leiId = params.leiId
	invariantResponse(leiId, 'Not found', { status: 404 })
	const lei = await prisma.lei.findUnique({
		where: { id: leiId },
		include: { titulos: true },
	})

	invariantResponse(lei, 'Not found', { status: 404 })

	return json({ lei })
}

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const leiId = params.leiId
	invariantResponse(leiId, 'Not found', { status: 404 })
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: schemaAddTitulo })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { name, id } = submission.value
	await prisma.titulo.upsert({
		where: { id: id ?? '__newTitulo__' },
		create: { name, status: true, leiId: leiId },
		update: { name },
	})

	return json(null)
}

export default function LeisLeiId() {
	const { lei } = useLoaderData<typeof loader>()
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const fetcher = useFetcher()
	const formRef = useRef<HTMLFormElement>(null)
	const navigation = useNavigation()
	const [form, fields] = useForm({
		id: 'form-addTitulo',
		constraint: getZodConstraint(schemaAddTitulo),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: schemaAddTitulo })
		},
		shouldRevalidate: 'onBlur',
	})

	const isSubmitting = navigation.state === 'submitting'

	useEffect(() => {
		if (isSubmitting) {
			formRef.current?.reset()
		}
	}, [isSubmitting])

	return (
		<>
			<div className="mt-3">
				<h1 className="text-xl">
					LEI: <span className="font-bold">{lei.name.toUpperCase()}</span>
				</h1>
				<hr className="my-2 h-0.5 bg-gray-200" />

				<div>
					<h1>Títulos</h1>
				</div>

				<div className="mt-3">
					<div className="mt-1 flow-root">
						<div className="my-2 flex w-full">
							<Form
								className="flex space-x-2"
								method="post"
								ref={formRef}
								{...getFormProps(form)}
							>
								<Field
									inputProps={{
										placeholder: 'nome do novo título',
										...getInputProps(fields.name, { type: 'text' }),
									}}
									errors={fields.name.errors}
								/>
								<Button name="_action" value="adicionarTitulo" type="submit">
									Adicionar Título
								</Button>
							</Form>
						</div>
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
												<th>
													<span className="sr-only">Visualizar</span>
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200 bg-white">
											{lei.titulos.map(titulo => (
												<tr
													key={titulo.id}
													className={`hover:bg-gray-200  ${
														params.tituloId === titulo.id
															? 'bg-green-500/10'
															: ''
													}`}
												>
													<td className="whitespace-nowrap pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
														<fetcher.Form method="post">
															<input
																type="hidden"
																value={titulo.id}
																name="id"
																readOnly
															/>
															<Field
																labelProps={{}}
																inputProps={{
																	onBlur: e =>
																		fetcher.submit(e.currentTarget.form),
																	defaultValue: titulo.name,
																	type: 'text',
																	name: 'name',
																}}
															/>
														</fetcher.Form>
													</td>
													<td
														className={`whitespace-nowrap px-3 py-4 text-sm ${
															titulo.status ? 'text-green-500' : 'text-red-500'
														} `}
													>
														{titulo.status ? 'Ativo' : 'Inativo'}
													</td>
													<td>
														<Link to={`${titulo.id}#capitulos`}>
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
				</div>
				<hr className="mt-5" />
				<Outlet />
			</div>
		</>
	)
}
