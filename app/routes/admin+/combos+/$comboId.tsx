import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { Spacer } from '#app/components/spacer'
import { Icon } from '#app/components/ui/icon'
import { Separator } from '#app/components/ui/separator'
import { StatusButton } from '#app/components/ui/status-button'
import { prisma } from '#app/utils/db.server'
import { useIsPending } from '#app/utils/misc'
import { ComboEditor, addLei } from './__combo-editor'

import { type action } from './__combo-editor.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const comboId = params.comboId
	invariantResponse(comboId, 'comboId não encontrado', { status: 404 })
	const combo = await prisma.combo.findUnique({
		where: { id: comboId },
		include: {
			leisCombos: {
				include: {
					lei: {
						include: { materia: { select: { name: true } } },
					},
				},
			},
		},
	})
	invariantResponse(combo, 'Combo não encontrado', { status: 404 })

	const url = new URL(request.url)
	const materiaId = url.searchParams.get('materiaId') || undefined
	const materiasPromise = prisma.materia.findMany({ orderBy: { name: 'asc' } })
	const leisPromise = prisma.lei.findMany({ where: { materiaId } })
	const [materias, leis] = await Promise.all([materiasPromise, leisPromise])

	return json({
		combo: {
			id: combo.id,
			name: combo.name,
			status: combo.status,
			urlHotmart: combo.urlHotmart,
			leis: combo.leisCombos.map(({ lei }) => ({
				...lei,
			})),
		},
		materias,
		leis,
	})
}

export { action } from './__combo-editor.server'

export default function ComboId() {
	const { combo, materias, leis } = useLoaderData<typeof loader>()

	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()

	const formRef = useRef<HTMLFormElement>(null)

	const [formAdd, fields] = useForm({
		id: 'add-lei',
		constraint: getZodConstraint(addLei),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: addLei })
		},
		shouldRevalidate: 'onBlur',
	})
	useEffect(() => {
		if (isPending) {
			formRef.current?.reset()
		}
	}, [isPending])
	return (
		<div>
			<ComboEditor combo={combo} />
			<Spacer size={'4xs'} />
			<Separator />
			<Spacer size={'4xs'} />
			<h1 className="text-2xl font-bold">Leis</h1>
			<div className="flex space-x-2">
				<Form>
					<select
						name="materiaId"
						onChange={e => submit(e.currentTarget.form)}
						value={searchParams.get('materiaId') || ''}
						className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						<option value="">Materias...</option>
						{materias.map(materia => (
							<option key={materia.id} value={materia.id}>
								{materia.name}
							</option>
						))}
					</select>
				</Form>
				<Form
					className="flex space-x-2"
					method="post"
					{...getFormProps(formAdd)}
					ref={formRef}
				>
					<select
						{...getInputProps(fields.leiId, { type: 'text' })}
						className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						<option value="">Leis...</option>
						{leis.map(lei => (
							<option key={lei.id} value={lei.id}>
								{lei.name}
							</option>
						))}
					</select>
					<StatusButton
						name="intent"
						value="add"
						form={formAdd.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						Adicionar
					</StatusButton>
				</Form>
			</div>
			<div>
				<Spacer size={'4xs'} />
				<Separator />
				<Spacer size={'4xs'} />
				<ul className="border-1 max-h-96 space-y-2 divide-y-2 overflow-y-scroll bg-gray-100 p-5 shadow-md">
					{combo.leis.map(lei => (
						<ItemListLei key={lei.id} lei={lei} />
					))}
				</ul>
			</div>
		</div>
	)
}

function ItemListLei({
	lei,
}: {
	lei: { id: string; name: string; materia: { name: string } }
}) {
	const fetcher = useFetcher()
	return (
		<li key={lei.id} className="flex items-center justify-between">
			<div className="flex flex-col">
				<span className="font-bold">{lei.name}</span>
				<span className="text-xs font-semibold">{lei.materia.name}</span>
			</div>
			<fetcher.Form method="post">
				<input type="hidden" value={lei.id} name="leiId" readOnly />
				<button
					name="intent"
					value="delete"
					type="submit"
					className="cursor-pointer rounded-md border border-red-500 px-2 py-1 text-red-500 shadow-md hover:bg-red-500 hover:text-white"
				>
					<span>Remover</span>
					<Icon name="trash" className="h-5 w-5" />
				</button>
			</fetcher.Form>
		</li>
	)
}
