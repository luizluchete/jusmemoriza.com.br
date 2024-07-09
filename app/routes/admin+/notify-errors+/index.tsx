import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, json, useLoaderData, useSearchParams } from '@remix-run/react'
import { Pagination } from '#app/components/ui/pagination'
import { prisma } from '#app/utils/db.server'
import { requireUserWithRole } from '#app/utils/permissions.server.js'

const ITEMS_PER_PAGE = 10

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1

	const errors = await prisma.notifyError.findMany({
		select: {
			id: true,
			fixed: true,
			quiz: { select: { enunciado: true } },
			flashcard: { select: { frente: true } },
			user: { select: { name: true, email: true } },
			userMessage: true,
		},
		take: ITEMS_PER_PAGE,
		skip: (page - 1) * ITEMS_PER_PAGE,
	})
	const count = await prisma.notifyError.count()

	return json({ errors, count })
}
export default function Index() {
	const { errors, count } = useLoaderData<typeof loader>()

	const [searchParams] = useSearchParams()
	return (
		<div className="mt-8 flow-root">
			<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
				<div className="inline-block min-w-full py-2 align-middle">
					<table className="min-w-full divide-y divide-gray-300">
						<thead>
							<tr className="w-full">
								<th
									scope="col"
									className="w-2/12 py-1 text-left text-sm font-semibold text-gray-900 "
								>
									Usuário
								</th>
								<th scope="col" className="w-1/12 text-left">
									Tipo
								</th>
								<th
									scope="col"
									className="w-7/12 py-1 text-left text-sm font-semibold text-gray-900"
								>
									Mensagem
								</th>
								<th>
									<span className="sr-only">status</span>
								</th>
								<th>
									<span className="sr-only">Ações</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y-8 divide-gray-200 bg-white">
							{errors.map(error => (
								<tr key={error.id} className="w-full">
									<td className="flex w-2/12 flex-col  divide-y whitespace-normal py-1  text-sm font-medium text-gray-900">
										<span>
											{error.user.name} ({error.user.email})
										</span>
									</td>
									<td className="w-1/12 whitespace-normal py-1 text-sm text-gray-500">
										{error.quiz ? (
											<span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
												QUIZ
											</span>
										) : (
											<span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
												FLASHCARD
											</span>
										)}
									</td>
									<td className="w-7/12 whitespace-normal py-1 text-sm text-gray-500">
										<span>{error.userMessage}</span>
									</td>
									<td>
										<span className="sr-only">
											{error.fixed ? 'Corrigido' : 'Pendente'}
										</span>
										{error.fixed ? (
											<span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
												Corrigido
											</span>
										) : (
											<span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
												Pendente
											</span>
										)}
									</td>
									<td>
										<Link to={`/admin/notify-errors/${error.id}`}>
											<button
												type="button"
												className="rounded-md border border-indigo-600 px-2 py-1 text-sm font-medium text-indigo-600 hover:border-indigo-900 hover:text-indigo-900"
											>
												Visualizar
											</button>
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<Pagination
						totalRegisters={count}
						registerPerPage={ITEMS_PER_PAGE}
						currentPage={Number(searchParams.get('page')) || 1}
					/>
				</div>
			</div>
		</div>
	)
}
