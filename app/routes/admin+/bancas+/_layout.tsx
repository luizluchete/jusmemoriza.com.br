import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const bancas = await prisma.banca.findMany({ orderBy: { name: 'asc' } })
	return json({ bancas })
}

export default function Index() {
	const { bancas } = useLoaderData<typeof loader>()
	return (
		<div className="px-4 sm:px-6 lg:px-8">
			<Outlet />
			<div className="flex justify-end">
				<Link to={'new'}>
					<button
						type="submit"
						className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>
						Cadastrar nova Banca
					</button>
				</Link>
			</div>
			{bancas.length === 0 ? (
				<span>Nenhuma banca cadastrada !</span>
			) : (
				<div className="flow-root">
					<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
						<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
							<table className="min-w-full divide-y divide-gray-300">
								<thead>
									<tr>
										<th
											scope="col"
											className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
										>
											Nome da Banca
										</th>

										<th
											scope="col"
											className="relative py-3.5 pl-3 pr-4 sm:pr-0"
										>
											<span className="sr-only">Editar</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{bancas.map(banca => {
										return (
											<tr key={banca.id}>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
													<div className="flex items-center space-x-2">
														<span>{banca.name}</span>
													</div>
												</td>

												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
													<div className="flex items-center space-x-2">
														<span
															className={
																banca.status ? 'text-green-500' : 'text-red-500'
															}
														>
															{banca.status ? 'Ativo' : 'Inativo'}
														</span>
													</div>
												</td>

												<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
													<div className="flex justify-end space-x-3">
														<Link
															to={`${banca.id}/edit`}
															className="text-indigo-600 hover:text-indigo-900"
														>
															Editar
															<span className="sr-only">, {banca.name}</span>
														</Link>
													</div>
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
