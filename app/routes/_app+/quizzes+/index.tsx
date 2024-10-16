import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Form, Link, useLoaderData, useSubmit } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { hexToRgba } from '#app/utils/misc'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const userId = await requireUserId(request)
	const materiaId = url.searchParams.get('materiaId') || undefined
	const materia = await prisma.materia.findFirst({
		select: { id: true, name: true, color: true },
		where: {
			id: materiaId,
			status: true,
			Lei: {
				some: {
					status: true,
					titulos: {
						some: {
							status: true,
							capitulos: {
								some: {
									status: true,
									artigos: {
										some: { status: true, quizzes: { some: { status: true } } },
									},
								},
							},
						},
					},
				},
			},
		},
	})
	invariantResponse(materia, 'Materia not found', { status: 404 })

	const leis = await prisma.lei.findMany({
		select: {
			id: true,
			name: true,
			titulos: {
				select: {
					capitulos: {
						select: {
							artigos: { select: { quizzes: { select: { _count: true } } } },
						},
					},
				},
			},
			LeiResultUser: {
				select: { ratingQuiz: true },
				where: { userId },
			},
		},
		where: {
			materiaId: materia.id,
			status: true,
			titulos: {
				some: {
					status: true,
					capitulos: {
						some: {
							status: true,
							artigos: {
								some: { status: true, quizzes: { some: { status: true } } },
							},
						},
					},
				},
			},
		},
	})

	const materias = await prisma.materia.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			Lei: {
				some: {
					status: true,
					titulos: {
						some: {
							status: true,
							capitulos: {
								some: {
									status: true,
									artigos: {
										some: { status: true, quizzes: { some: { status: true } } },
									},
								},
							},
						},
					},
				},
			},
		},
	})
	return json({ materia, leis, materias })
}

export default function Index() {
	const { materia, materias, leis } = useLoaderData<typeof loader>()
	const submit = useSubmit()
	return (
		<div className="flex flex-col gap-5">
			<div className="flex gap-4">
				<div
					id="materia-filtro"
					className="min-w-72 space-y-5 rounded-2xl border border-gray-400 p-5"
				>
					<div className="flex w-full justify-center space-x-3">
						<Icon name="tabler-filter" className="h-5 w-5" />
						<span className="text-lg font-bold">Filtros</span>
					</div>
					<Form onChange={e => submit(e.currentTarget)}>
						<Select defaultValue={materia.id} name="materiaId">
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Matéria" />
							</SelectTrigger>
							<SelectContent>
								{materias.map(({ id, name }) => (
									<SelectItem key={id} value={id}>
										{name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Form>
				</div>
				<div
					id="materia-dados"
					className="flex flex-1 rounded-2xl border p-7"
					style={{
						backgroundColor: materia.color
							? hexToRgba(materia.color, 0.05)
							: 'white',
						borderColor: materia.color || 'black',
					}}
				>
					<Icon
						name="circle-wavy-fill"
						className="w-58 h-48"
						style={{ color: materia.color || 'black' }}
					/>
					<div className="flex h-full flex-col justify-center">
						<h1 className="text-4xl font-extrabold">{materia.name}</h1>
						<span className="text-2xl font-medium text-gray-500">
							26 Quizzes
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{leis.map(lei => {
					let nomeLei = lei.name
					const index = lei.name.indexOf('(')

					// adiciona o quebra linha antes do '('
					if (index > 0) {
						nomeLei = `${lei.name.slice(0, index)}<br/>${lei.name.slice(index)}`
					}

					const rating = lei.LeiResultUser[0]?.ratingQuiz || 0

					return (
						<Link key={lei.id} to={`${lei.id}/start`}>
							<div
								className="relative flex h-full w-full cursor-pointer justify-between rounded-xl border p-5"
								style={{
									borderColor: materia.color || 'black',
									backgroundColor: materia.color
										? hexToRgba(materia.color, 0.05)
										: 'white',
								}}
							>
								<div className="flex flex-1 flex-col">
									<span
										className="text-wrap text-xl font-medium"
										dangerouslySetInnerHTML={{ __html: nomeLei }}
									></span>
									<span>5 Questões</span>
								</div>
								<div className="flex items-end justify-end">
									<div className="flex">
										<Icon
											name={rating > 0 ? 'star-color' : 'star-outline'}
											className="h-7 w-7 text-yellow-500"
										/>
										<Icon
											name={rating > 1 ? 'star-color' : 'star-outline'}
											className="relative -top-1 h-10 w-10 text-yellow-500"
										/>
										<Icon
											name={rating > 2 ? 'star-color' : 'star-outline'}
											className="h-7 w-7  text-yellow-500"
										/>
									</div>
								</div>
							</div>
						</Link>
					)
				})}
			</div>
		</div>
	)
}
