import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring } from '@react-spring/web'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useSearchParams } from '@remix-run/react'
import { useState } from 'react'
import { Icon } from '#app/components/ui/icon'
import { Pagination } from '#app/components/ui/pagination'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

const PER_PAGE = 8

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const listId = params.listId
	invariantResponse(listId, 'ListId is required', { status: 404 })
	const list = await prisma.listsUser.findFirst({
		select: { color: true, icon: true, name: true, id: true },
		where: { id: listId, userId },
	})
	invariantResponse(list, 'list not found', { status: 404 })
	const flashcards = await prisma.listsUsersFlashcards.findMany({
		select: {
			flashcard: {
				select: {
					id: true,
					frente: true,
					verso: true,
					artigo: {
						select: {
							capitulo: {
								select: {
									titulo: {
										select: {
											lei: {
												select: {
													name: true,
													materia: { select: { name: true, color: true } },
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
		},
		where: { flashcardId: { not: null }, listId },
		skip: (page - 1) * PER_PAGE,
		take: PER_PAGE,
	})
	const [count] = await Promise.all([
		prisma.listsUsersFlashcards.count({
			where: { listId: listId, flashcardId: { not: null } },
		}),
	])
	return json({
		count,
		list,
		flashcards: flashcards.map(({ flashcard }) => ({
			id: flashcard!.id,
			frente: flashcard!.frente,
			verso: flashcard!.verso,
			lei: flashcard!.artigo.capitulo.titulo.lei.name,
			materia: {
				name: flashcard!.artigo.capitulo.titulo.lei.materia.name,
				color: flashcard!.artigo.capitulo.titulo.lei.materia.color,
			},
		})),
	})
}

export default function () {
	const { count, flashcards } = useLoaderData<typeof loader>()
	const [params] = useSearchParams()
	const page = Number(params.get('page')) || 1
	return (
		<div>
			<div className="grid grid-cols-1 place-items-center gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
				{flashcards.map(flashcard => (
					<Card
						key={flashcard.id}
						color={flashcard.materia.color || 'black'}
						frente={flashcard.frente}
						verso={flashcard.verso}
						materia={flashcard.materia.name}
						lei={flashcard.lei}
					/>
				))}
			</div>
			<Pagination
				totalRegisters={count}
				registerPerPage={PER_PAGE}
				currentPage={page}
			/>
		</div>
	)
}

type CardProps = {
	color: string
	frente: string
	verso: string
	materia: string
	lei: string
}
function Card({ color, frente, lei, materia, verso }: CardProps) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})
	return (
		<div className="relative h-[400px] w-full max-w-72">
			<animated.div
				style={{ transform }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-1 backface-hidden"
			>
				<div
					className="flex h-full w-full flex-col items-center justify-around rounded-xl border-2 px-1"
					style={{ borderColor: color }}
				>
					<div className="flex flex-col">
						<Icon
							name="circle-wavy-question-fill"
							className="h-20 w-20"
							style={{ color }}
						/>
						<h1
							className="text-center text-xl font-extrabold"
							style={{ color }}
						>
							{materia}
						</h1>
					</div>

					<p className="overflow-auto text-center text-sm font-medium">
						{frente}
					</p>

					<h3 className="text-xs font-semibold opacity-80">{lei}</h3>
				</div>
			</animated.div>
			<animated.div
				style={{ transform, rotateY: '180deg' }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-1 backface-hidden"
			>
				<div
					className="flex h-full w-full flex-col items-center justify-start rounded-xl border-2  p-1"
					style={{ borderColor: color }}
				>
					<div className="flex h-full w-full flex-1 flex-col space-y-5">
						<span
							className="text-center text-xl font-extrabold"
							style={{ color }}
						>
							Resposta
						</span>

						<div className="overflow-auto text-justify text-sm font-normal">
							{verso}
						</div>
					</div>
				</div>
			</animated.div>
		</div>
	)
}
