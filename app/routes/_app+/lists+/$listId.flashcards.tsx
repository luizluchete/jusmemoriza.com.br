import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring } from '@react-spring/web'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, useFetcher, useLoaderData } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '#app/components/ui/carousel'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import logoBranco from '#app/components/ui/img/logo_jusmemoriza_branco.png'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn } from '#app/utils/misc'

const schemaAnswerFlashcard = z.object({
	intent: z.literal('answer'),
	id: z.string(),
	answer: z.enum(['sabia', 'duvida', 'nao_sabia']),
})

const schemaRemoveList = z.object({
	intent: z.literal('removeList'),
	id: z.string(),
})
const schemaList = z.discriminatedUnion('intent', [
	schemaAnswerFlashcard,
	schemaRemoveList,
])

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const listId = params.listId
	invariantResponse(listId, 'ListId is required', { status: 404 })

	const list = await prisma.listsUser.findFirst({
		select: {
			id: true,
			name: true,
			flashcards: {
				select: {
					flashcard: {
						select: {
							id: true,
							frente: true,
							verso: true,
							fundamento: true,
							artigo: {
								select: {
									name: true,
									capitulo: {
										select: {
											name: true,
											titulo: {
												select: {
													name: true,
													lei: {
														select: {
															name: true,
															materia: { select: { name: true } },
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
			},
		},
		where: { id: listId, userId },
	})
	invariantResponse(list, 'list not found', { status: 404 })
	return json({
		list: {
			id: list.id,
			name: list.name,
			flashcards: list.flashcards.map(({ flashcard }) => ({
				id: flashcard.id,
				frente: flashcard.frente,
				verso: flashcard.verso,
				fundamento: flashcard.fundamento,
				artigo: {
					name: flashcard.artigo.name,
				},
				capitulo: {
					name: flashcard.artigo.capitulo.name,
				},
				titulo: {
					name: flashcard.artigo.capitulo.titulo.name,
				},
				lei: {
					name: flashcard.artigo.capitulo.titulo.lei.name,
				},
				materia: {
					name: flashcard.artigo.capitulo.titulo.lei.materia.name,
				},
			})),
		},
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const listId = params.listId
	invariantResponse(listId, 'ListId is required', { status: 404 })
	const formData = await request.formData()

	const submission = parseWithZod(formData, { schema: schemaList })
	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}

	const { intent } = submission.value
	if (intent === 'removeList') {
		const { id } = submission.value
		const exists = await prisma.listsUsersFlashcards.findFirst({
			where: { flashcardId: id, list: { userId, id: listId } },
		})
		if (exists) {
			await prisma.listsUsersFlashcards.delete({
				where: {
					listId_flashcardId: {
						flashcardId: exists.flashcardId,
						listId: exists.listId,
					},
				},
			})
			return json({ result: submission.reply() })
		}
	}

	if (intent === 'answer') {
		const { id, answer } = submission.value
		await prisma.flashcardUserAnswers.create({
			data: { answer, flashcardId: id, userId },
		})
		return json({ result: submission.reply() })
	}

	return json({ result: submission.reply() }, { status: 400 })
}

export default function ListIdFlashcards() {
	const { list } = useLoaderData<typeof loader>()
	const [index, setIndex] = useState(0)

	const [api, setApi] = useState<CarouselApi>()

	useEffect(() => {
		if (api) {
			api.on('slidesInView', () => {
				setIndex(api.slidesInView().at(0) || 0)
			})
		}
	}, [api])

	let currentFlashcard = list.flashcards[index]

	return list.flashcards.length === 0 ? (
		<div className="w-full text-center">
			<span>Nenhum flashcard incluído nesta lista</span>
		</div>
	) : (
		<Carousel
			setApi={setApi}
			className="mx-auto max-w-md"
			opts={{ dragFree: false }}
		>
			<div className="my-1 flex flex-col rounded-md border px-2 py-1 shadow-md">
				<h1 className="font-medium">{list.name}</h1>
				<span className="text-center text-xl font-bold">
					<span className="text-3xl">{index + 1}</span> /{' '}
					{list.flashcards.length}
				</span>
			</div>
			<CarouselContent>
				{list.flashcards.map(flashcard => (
					<CarouselItem key={flashcard.id}>
						<ItemFlashcardList flashcard={flashcard} />
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselNext />
			<CarouselPrevious />
			{currentFlashcard ? (
				<div className="m-2 flex justify-around rounded-md py-1 shadow-md">
					<Form navigate={false} method="post">
						<input
							type="hidden"
							name="id"
							value={currentFlashcard.id}
							readOnly
						/>
						<button type="submit" name="intent" value="removeList">
							<div className="flex flex-col items-center hover:text-red-500">
								<Icon name="trash" className="h-6 w-6" />
								<span>Remover da Lista</span>
							</div>
						</button>
					</Form>
					{currentFlashcard.fundamento ? (
						<Dialog>
							<DialogTrigger>
								<div className="flex cursor-pointer flex-col items-center hover:text-primary">
									<Icon name="books" className="h-6 w-6" />
									<span>Fundamento</span>
								</div>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Fundamento</DialogTitle>
									<DialogDescription>
										<div
											className="overflow-auto whitespace-normal text-justify"
											dangerouslySetInnerHTML={{
												__html: currentFlashcard.fundamento || '',
											}}
										/>
									</DialogDescription>
								</DialogHeader>
							</DialogContent>
						</Dialog>
					) : null}
				</div>
			) : null}
		</Carousel>
	)
}

function ItemFlashcardList({
	flashcard: { frente, verso, materia, lei, id },
}: {
	flashcard: {
		id: string
		frente: string
		verso: string
		fundamento?: string | null
		materia: {
			name: string
		}
		lei: { name: string }
	}
}) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})
	const fetcher = useFetcher<typeof action>()
	let disabled = !!fetcher.data
	let answer
	if (fetcher.data && fetcher.data.result.initialValue?.intent === 'answer') {
		answer = fetcher.data.result.initialValue.answer
	}
	return (
		<div
			className="relative flex h-dvh max-h-[500px] w-full"
			style={{ transformStyle: 'preserve-3d' }}
		>
			<animated.div
				style={{ transform }}
				className={cn(
					'absolute flex h-full w-full flex-col rounded-xl border border-black bg-primary bg-cover p-3 will-change-auto backface-hidden',
				)}
			>
				<div className="flex items-center">
					<h2 className="flex-1 text-lg font-bold text-gray-300">
						{materia.name}
					</h2>

					<img
						src={logoBranco}
						alt="logo JusMemoriza"
						className="h-10 object-contain"
					/>
				</div>

				<div
					id="texto-frente"
					className="mt-5 flex-1 whitespace-normal rounded-lg bg-white px-3 pt-5"
				>
					<h3 className="text-xl font-bold">{lei.name}</h3>

					<div
						className="max-h-72 overflow-auto text-justify text-xl"
						dangerouslySetInnerHTML={{ __html: frente }}
					/>
				</div>
				<div className="mt-3 flex w-full justify-center">
					<button onClick={() => setFlipped(prev => !prev)}>
						<div className="flex items-center gap-x-3 rounded-md bg-gray-300 px-6 py-3 text-base font-medium text-black shadow-sm hover:brightness-90">
							<Icon name="question-mark-circled" className="h-7 w-7" />
							<span>Ver Resposta</span>
						</div>
					</button>
				</div>
			</animated.div>
			<animated.div
				id="verso"
				style={{ transform, rotateY: '180deg' }}
				className="absolute flex h-full w-full flex-col rounded-xl border border-black bg-gray-200 bg-cover p-3 will-change-auto backface-hidden"
			>
				<div className="flex pb-3">
					<div className="flex h-full w-full items-center justify-center">
						<button
							onClick={() => setFlipped(state => !state)}
							className="inline-flex items-center rounded-md border bg-gray-300 px-6 py-3 text-base font-medium text-black shadow-sm hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						>
							<Icon
								name="question-mark-circled"
								className="-ml-1 mr-3 h-5 w-5"
								aria-hidden="true"
							/>
							Ver pergunta
						</button>
					</div>
				</div>
				<div className="flex-1 whitespace-normal rounded-lg bg-white px-3 pt-2">
					<div
						className="max-h-72 overflow-auto text-justify text-xl"
						dangerouslySetInnerHTML={{ __html: verso }}
					/>
				</div>

				<fetcher.Form method="post">
					<input type="hidden" name="id" readOnly value={id} />
					<input type="hidden" name="intent" value="answer" />
					<div className="w-ful mt-3 flex justify-around">
						<button name="answer" value="sabia" disabled={disabled}>
							<div
								className={cn(
									'flex flex-col items-center',
									!disabled ? ' hover:text-[#007012]' : '',
									answer === 'sabia' ? 'text-[#007012]' : '',
								)}
							>
								<Icon
									name="emoji-acertei"
									className={cn(
										'h-12 w-12 rounded-full ',
										!disabled ? 'hover:bg-[#DAEBD1]' : '',
										answer === 'sabia' ? 'bg-[#DAEBD1]' : '',
									)}
								/>
								<span>Acertei</span>
							</div>
						</button>

						<button name="answer" value="duvida" disabled={disabled}>
							<div
								className={cn(
									'flex flex-col items-center',
									!disabled ? ' hover:text-primary' : '',
									answer === 'duvida' ? 'text-primary' : '',
								)}
							>
								<div
									className={cn(
										'h-12 w-12 rounded-full ',
										!disabled ? 'hover:bg-purple-500/10' : '',
										answer === 'duvida' ? 'bg-purple-500/10' : '',
									)}
								>
									<Icon name="emoji-duvida" className="h-12 w-12" />
								</div>
								<span>Dúvida</span>
							</div>
						</button>
						<button name="answer" value="nao_sabia" disabled={disabled}>
							<div
								className={cn(
									'flex flex-col items-center',
									!disabled ? ' hover:text-red-500' : '',
									answer === 'nao_sabia' ? 'text-red-500' : '',
								)}
							>
								<Icon
									name="emoji-errei"
									className={cn(
										'h-12 w-12 rounded-full ',
										!disabled ? 'hover:bg-[#F8D8DE]' : '',
										answer === 'nao_sabia' ? 'bg-[#F8D8DE]' : '',
									)}
								/>
								<span>Não Sabia</span>
							</div>
						</button>
					</div>
				</fetcher.Form>
			</animated.div>
		</div>
	)
}
