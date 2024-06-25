import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { getComboImgSrc } from '#app/utils/misc.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const combos = await prisma.combo.findMany({
		select: {
			id: true,
			name: true,
			color: true,
			description: true,
			leisCombos: {
				select: {
					lei: {
						select: {
							id: true,
							name: true,
							materia: { select: { name: true } },
						},
					},
				},
			},
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
	})

	return json({ combos })
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
						Nenhum combo encontrado
					</div>
				)}

				<ul className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{combos.map(combo => (
						<li key={combo.id}>
							<Link
								to={combo.id}
								prefetch="intent"
								key={combo.id}
								className="relative transition-all duration-300 ease-in-out hover:brightness-95"
							>
								<div className="absolute right-3 top-3 text-xs text-gray-500">
									Questões Adaptadas
								</div>
								<div className="flex h-full w-full cursor-pointer flex-col space-y-8 rounded-md border bg-white px-5 py-8 shadow-md">
									<div
										className="flex h-24 w-24 items-center justify-center rounded-full p-4"
										style={{ backgroundColor: combo.color ?? 'gray' }}
									>
										<img
											className="h-full w-full rounded-full object-cover"
											src={getComboImgSrc(combo.image?.id)}
											alt={combo.name}
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
