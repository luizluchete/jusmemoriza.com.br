import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Button } from '#app/components/ui/button'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const materias = await prisma.materia.findMany({ orderBy: { name: 'asc' } })
	return json({ materias })
}

export default function () {
	const { materias } = useLoaderData<typeof loader>()
	return (
		<div className="px-4 sm:px-6 lg:px-8">
			<div className="flex justify-end">
				<Link to={'criar'}>
					<Button>Criar Matéria</Button>
				</Link>
			</div>
			{materias.length === 0 ? (
				<span>Nenhuma matéria cadastrada</span>
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
											Nome da Matéria
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
									{materias.map(materia => {
										return (
											<tr
												key={materia.id}
												className="even:bg-gray-50 hover:bg-primary/10"
											>
												<td className="whitespace-nowrap py-1 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
													<div className="flex items-center space-x-2">
														<div
															className="h-2 w-2 rounded-full"
															style={{
																backgroundColor: materia.color
																	? materia.color
																	: undefined,
															}}
														/>
														<span>{materia.name}</span>
													</div>
												</td>

												<td className="relative whitespace-nowrap py-1 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
													<Link
														to={materia.id}
														className="text-indigo-600 hover:text-indigo-900"
													>
														Visualizar
														<span className="sr-only">, {materia.name}</span>
													</Link>
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
