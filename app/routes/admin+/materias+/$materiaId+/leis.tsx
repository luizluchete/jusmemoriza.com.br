import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node'
import { Link, Outlet, useFetcher, useLoaderData } from '@remix-run/react'
import { Button } from '#app/components/ui/button'
import { prisma } from '#app/utils/db.server'
import { requireUserWithRole } from '#app/utils/permissions.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const materiaId = params.materiaId
	invariantResponse(materiaId, 'Not found', { status: 404 })
	const leis = await prisma.lei.findMany({
		where: { materiaId },
		orderBy: { name: 'asc' },
	})
	return json({ leis })
}

export async function action({ request }: ActionFunctionArgs) {
	const form = await request.formData()
	const _action = form.get('_action')
	if (_action === 'alterarStatus') {
		const leiId = form.get('id') + ''
		const status = form.get('status') === 'on'
		await prisma.lei.update({ where: { id: leiId }, data: { status } })
		return json({})
	}
	return json({})
}

export default function MateriaIdLeis() {
	const { leis } = useLoaderData<typeof loader>()
	return (
		<div>
			<div className="mt-1 flex justify-end">
				<Link to="new">
					<Button>Criar LEI</Button>
				</Link>
			</div>

			<div className="">
				<div className="mt-1 flow-root">
					<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
						<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
							<table className="min-w-full divide-y divide-gray-300">
								<thead>
									<tr>
										<th
											scope="col"
											className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
										>
											Nome da Lei
										</th>
										<th
											scope="col"
											className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
										>
											Status
										</th>
										<th
											scope="col"
											className="relative py-3.5 pl-3 pr-4 sm:pr-3"
										>
											<span className="sr-only">Visualizar</span>
										</th>
									</tr>
								</thead>
								<tbody className="bg-white">
									{leis.map(lei => (
										<ItemLei
											key={lei.id}
											lei={{
												...lei,
											}}
										/>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			<Outlet />
		</div>
	)
}

const ItemLei = ({
	lei,
}: {
	lei: { status: boolean; id: string; name: string }
}) => {
	const fetcher = useFetcher()
	const otimiscStatus = fetcher.formData
		? fetcher.formData.get('status') === 'on'
		: lei.status

	return (
		<tr className="even:bg-gray-50 hover:bg-primary/10">
			<td className="whitespace-nowrap py-0.5 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">
				{lei.name}
			</td>
			<td className={`whitespace-nowrap px-3 py-0.5 text-sm`}>
				<div className="flex space-x-3">
					<span
						className={`${otimiscStatus ? 'text-green-500' : 'text-red-500'}`}
					>
						{otimiscStatus ? 'Ativo' : 'Inativo'}
					</span>
					<fetcher.Form method="post">
						<input type="text" hidden readOnly value={lei.id} name="id" />
						<input
							type="text"
							hidden
							name="status"
							value={otimiscStatus ? 'off' : 'on'}
							readOnly
						/>
						<button
							className="rounded-md bg-gray-300 p-0.5 shadow-sm"
							name="_action"
							value="alterarStatus"
						>
							{otimiscStatus ? 'Desativar' : 'ativar'}
						</button>
					</fetcher.Form>
				</div>
			</td>
			<td className="relative whitespace-nowrap py-0.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-3">
				<div className="flex justify-end space-x-3">
					<Link
						to={`${lei.id}/edit`}
						className="text-indigo-600 hover:text-indigo-900"
					>
						Editar
						<span className="sr-only">, {lei.name}</span>
					</Link>
					<Link
						to={`${lei.id}`}
						className="text-indigo-600 hover:text-indigo-900"
					>
						Selecionar
						<span className="sr-only">, {lei.name}</span>
					</Link>
				</div>
			</td>
		</tr>
	)
}
