import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const combos = await prisma.combo.findMany({
		where: {
			status: true,
			leisCombos: {
				some: {
					lei: {
						status: true,
						materia: { status: true },
						titulos: {
							some: {
								status: true,
								capitulos: {
									some: {
										status: true,
										artigos: {
											some: {
												status: true,
												quizzes: { some: { status: true } },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		include: {
			leisCombos: { include: { lei: { include: { materia: true } } } },
		},
	})

	const mappedCombos = combos.map(combo => {
		return {
			id: combo.id,
			name: combo.name,
			leis: combo.leisCombos.map(({ lei }) => ({
				id: lei.id,
				name: lei.name,
				materia: { ...lei.materia },
			})),
		}
	})
	return json({ combos: mappedCombos })
}

export default function LeiSeca() {
	const { combos } = useLoaderData<typeof loader>()
	return (
		<div className="container">
			<div>
				<div>
					<div className="mb-5 flex w-full flex-col items-center justify-center space-y-1">
						<h2 className="text-xl font-semibold text-primary">
							Escolha um COMBO para estudar
						</h2>
						<h3 className="text-sm font-normal text-gray-500">
							Selecione abaixo o combo para estudar
						</h3>
					</div>
					<hr />
				</div>

				{combos.length === 0 && (
					<div className="flex items-center justify-center p-20">
						Nenhuma combo encontrado
					</div>
				)}

				<ul className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
					{combos.map(combo => (
						<li key={combo.id}>
							<Link
								to={combo.id}
								prefetch="intent"
								key={combo.id}
								className="col-span-1 flex h-36 rounded-md shadow-sm hover:cursor-pointer hover:brightness-95"
							>
								<div className="flex flex-1 items-start justify-between truncate rounded-md border-b border-r border-t border-gray-200 bg-primary shadow-2xl ">
									<div className="flex-1 truncate px-4 py-2 text-sm">
										<div className="flex flex-col truncate">
											<span className="mb-1 truncate text-xl font-extrabold text-white">
												{combo.name}
											</span>
											<ul className="flex list-outside list-disc flex-col pl-5 text-xs font-semibold text-gray-200">
												{combo.leis.slice(0, 4).map(lei => (
													<li key={combo.id + lei.id}>{lei.name}</li>
												))}
												{combo.leis.length > 5 ? <li>E mais...</li> : null}
											</ul>
										</div>
									</div>
								</div>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
