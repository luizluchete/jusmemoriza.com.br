import { Link, json, useLoaderData } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon'
import { prisma } from '#app/utils/db.server'

export async function loader() {
	const combos = await prisma.combo.findMany({
		select: {
			id: true,
			name: true,
			description: true,
			color: true,
			image: true,
		},
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
												flashcards: { some: { status: true } },
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
	})

	return json({ combos })
}

export default function Index() {
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
						Nenhum combo encontrado
					</div>
				)}

				<ul className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{combos.map(combo => (
						<li key={combo.id}>
							<Link
								to={`${combo.id}/type/initial`}
								prefetch="intent"
								key={combo.id}
								className=" transition-all duration-300 ease-in-out hover:scale-110 hover:brightness-95"
							>
								<div className="flex h-60 w-full cursor-pointer flex-col space-y-8 rounded-md border bg-white p-5 shadow-md transition-all duration-300 hover:scale-105">
									<div className="flex w-full justify-end">
										<Icon
											name="cards"
											className="h-16 w-16"
											style={{ color: combo.color ?? 'gray' }}
										/>
									</div>
									<div>
										<h1 className="text-xl font-bold">{combo.name}</h1>
										<span className="text-justify text-xs leading-none text-gray-500">
											{combo.description}
										</span>
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
