import { animated, useSpring } from '@react-spring/web'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData, useSearchParams } from '@remix-run/react'
import { useState } from 'react'
import { Button } from '#app/components/ui/button'

import { Icon } from '#app/components/ui/icon'
import { Pagination } from '#app/components/ui/pagination'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { createToastHeaders } from '#app/utils/toast.server'

const PER_PAGE = 10
export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const myFlashcards = await prisma.userFlashcard.findMany({
		select: {
			id: true,
			frente: true,
			verso: true,
			lei: { select: { name: true, materia: { select: { name: true } } } },
		},
		where: { userId },
		orderBy: { updatedAt: 'desc' },
	})
	const count = await prisma.userFlashcard.count({ where: { userId } })
	return json({ myFlashcards, count })
}

const excluirMyFlashcardIntent = 'excluirMyFlashcard'
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = String(formData.get('intent'))
	if (intent === excluirMyFlashcardIntent) {
		return excluirMyFlashcardAction({ formData, userId })
	}
	return json({ message: 'invalid intent' }, { status: 400 })
}

export default function Index() {
	const { myFlashcards, count } = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const page = Number(searchParams.get('page')) || 1
	return (
		<>
			<Outlet />
			<div className="flex w-full flex-col">
				<div className="flex w-full justify-end">
					<Link to="new">
						<Button>Criar flashcard</Button>
					</Link>
				</div>
				<div className="mt-5 grid grid-cols-1 place-items-center gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
					{myFlashcards.map(flashcard => (
						<Card
							key={flashcard.id}
							id={flashcard.id}
							color={'black'}
							frente={flashcard.frente}
							verso={flashcard.verso}
							materia={flashcard.lei.materia.name}
							lei={flashcard.lei.name}
						/>
					))}
				</div>
				<Pagination
					totalRegisters={count}
					registerPerPage={PER_PAGE}
					currentPage={page}
				/>
			</div>
		</>
	)
}

type CardProps = {
	id: string
	color: string
	frente: string
	verso: string
	materia: string
	lei: string
}
function Card({ color, frente, lei, materia, verso, id }: CardProps) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(1000px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})
	return (
		<div className="relative h-[355px] w-full max-w-60 cursor-pointer transition-all duration-300 hover:-translate-y-2">
			<animated.div
				style={{ transform }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-1 backface-hidden"
			>
				<div className="absolute right-3 top-1 z-10 cursor-pointer">
					{/* <DropdownCard flashcardId={id} /> */}
				</div>
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

					<h3 className="text-center text-xs font-semibold opacity-80">
						{lei}
					</h3>
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

async function excluirMyFlashcardAction({
	formData,
	userId,
}: {
	userId: string
	formData: FormData
}) {
	const flashcardId = String(formData.get('id'))
	const exists = await prisma.userFlashcard.findFirst({
		where: {
			id: flashcardId,
			userId,
		},
	})
	if (exists) {
		await prisma.userFlashcard.delete({ where: { id: exists.id } })
	}
	return json(
		{ result: 'sucess' },
		{
			headers: await createToastHeaders({
				description: 'Flashcard excluído com sucesso',
			}),
		},
	)
}
