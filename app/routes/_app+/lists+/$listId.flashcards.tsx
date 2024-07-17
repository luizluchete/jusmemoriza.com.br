import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring } from '@react-spring/web'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { useFetcher, useLoaderData } from '@remix-run/react'
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
import frenteFlashcard from '#app/components/ui/img/frente-flashcard.jpeg'
import versoFlashcard from '#app/components/ui/img/verso-flashcard.jpeg'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, useDoubleCheck } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server.js'

const schemaAnswerFlashcard = z.object({
	intent: z.literal('answer'),
	id: z.string(),
	answer: z.enum(['sabia', 'duvida', 'nao_sabia']),
})

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
			},
		},
		where: {
			id: listId,
			userId,
		},
	})
	invariantResponse(list, 'list not found', { status: 404 })
	return json({
		list: {
			id: list.id,
			name: list.name,
			flashcards: list.flashcards
				.filter(f => !!f.flashcard)
				.map(({ flashcard }) => {
					if (!flashcard) return null
					return {
						id: flashcard.id,
						frente: flashcard.frente,
						verso: flashcard.verso,
						fundamento: flashcard.fundamento,
						lei: {
							name: flashcard.artigo.capitulo.titulo.lei.name,
							materia: {
								name: flashcard.artigo.capitulo.titulo.lei.materia.name,
								color: flashcard.artigo.capitulo.titulo.lei.materia.color,
							},
						},
					}
				}),
		},
	})
}

type MyListsActionArgs = {
	request: Request
	userId: string
	listId: string
	formData: FormData
}
const removeListIntent = 'removeList'
const answerFlashcardIntent = 'answer'

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const listId = params.listId
	invariantResponse(listId, 'ListId is required', { status: 404 })
	const formData = await request.formData()

	const { intent } = Object.fromEntries(formData)

	if (intent === removeListIntent) {
		return removeListAction({ request, userId, formData, listId })
	}

	if (intent === answerFlashcardIntent) {
		return answerFlashcardAction({ request, userId, formData, listId })
	}

	throw new Response(`Invalid intent "${intent}"`, { status: 400 })
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
				{list.flashcards.map(flashcard => {
					if (!flashcard) return null
					return (
						<CarouselItem key={flashcard.id}>
							<ItemFlashcardList flashcard={flashcard} />
						</CarouselItem>
					)
				})}
			</CarouselContent>
			<CarouselNext />
			<CarouselPrevious />
		</Carousel>
	)
}

function ItemFlashcardList({
	flashcard: { frente, verso, lei, id, fundamento },
}: {
	flashcard: {
		id: string
		frente: string
		verso: string
		fundamento?: string | null

		lei: {
			name: string
			materia: {
				name: string
				color?: string | null
			}
		}
	}
}) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})

	return (
		<div className="relative h-[600px] w-[440px]">
			<animated.div
				style={{ transform }}
				className="absolute flex h-full w-full rounded-md border shadow-md backface-hidden"
				onClick={() => setFlipped(state => !state)}
			>
				<img
					src={frenteFlashcard}
					alt="frente-card"
					className="absolute z-0 h-full w-full rounded-md object-cover"
				/>
				<div
					className="z-10 flex h-full w-full flex-col justify-between rounded-lg border-t-8"
					style={{ borderColor: lei.materia.color ?? 'gray' }}
				>
					<div className="mt-20 flex w-full flex-col items-center justify-center space-y-5">
						<div
							className="flex h-24 w-24 items-center justify-center rounded-full p-4 shadow-xl"
							style={{ backgroundColor: lei.materia.color ?? 'gray' }}
						>
							<Icon
								name="question"
								className="h-full w-full rounded-full object-cover text-white"
							/>
						</div>

						<h1 className="text-3xl font-bold">{lei.materia.name}</h1>
						<div
							className="flex-1 overflow-auto px-5 text-justify text-xl text-gray-600"
							dangerouslySetInnerHTML={{ __html: frente }}
						/>
					</div>
					<div className="flex w-full justify-center">
						<h2 className="mb-5 text-2xl font-semibold text-gray-600">
							{lei.name}
						</h2>
					</div>
				</div>
			</animated.div>

			<animated.div
				style={{ transform, rotateY: '180deg' }}
				className="absolute flex h-full w-full rounded-md border shadow-md backface-hidden"
				onClick={() => setFlipped(state => !state)}
			>
				<img
					src={versoFlashcard}
					alt="verso-card"
					className="absolute z-0 h-full w-full rounded-md object-cover"
				/>
				<div
					className="z-10 flex h-full w-full flex-col justify-between rounded-lg border-t-8"
					style={{ borderColor: lei.materia.color ?? 'gray' }}
				>
					<div className="flex w-full items-center justify-end space-x-5 p-2">
						<RemoveFlashcardList flashcardId={id} />
						{fundamento ? (
							<Dialog>
								<DialogTrigger onClick={e => e.stopPropagation()}>
									<div className="flex cursor-pointer flex-col items-center text-primary hover:brightness-150">
										<Icon name="books" className="h-6 w-6" />
										<span>Fundamento</span>
									</div>
								</DialogTrigger>
								<DialogContent onClick={e => e.stopPropagation()}>
									<DialogHeader>
										<DialogTitle>Fundamento</DialogTitle>
										<DialogDescription>
											<div
												className="overflow-auto whitespace-normal text-justify"
												dangerouslySetInnerHTML={{
													__html: fundamento,
												}}
											/>
										</DialogDescription>
									</DialogHeader>
								</DialogContent>
							</Dialog>
						) : null}
					</div>
					<div className="flex w-full flex-1 flex-col space-y-3 px-3">
						<span className="text-3xl font-bold">Resposta</span>
						<div
							className="flex-1 overflow-auto text-justify text-xl text-gray-600"
							dangerouslySetInnerHTML={{ __html: verso }}
						/>
					</div>
					<AnswerFlashcardList id={id} />
				</div>
			</animated.div>
		</div>
	)
}

async function answerFlashcardAction({ userId, formData }: MyListsActionArgs) {
	const submission = parseWithZod(formData, { schema: schemaAnswerFlashcard })
	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}
	const { id, answer } = submission.value
	await prisma.flashcardUserAnswers.create({
		data: { answer, flashcardId: id, userId },
	})
	return json({ result: submission.reply() })
}

function AnswerFlashcardList({ id }: { id: string }) {
	const fetcher = useFetcher<typeof answerFlashcardAction>()
	let disabled = !!fetcher.data
	let answer
	if (fetcher.data && fetcher.data.result.initialValue?.intent === 'answer') {
		answer = fetcher.data.result.initialValue.answer
	}

	return (
		<fetcher.Form method="post">
			<input type="hidden" name="id" readOnly value={id} />
			<input type="hidden" name="intent" value={answerFlashcardIntent} />
			<div className="w-ful mt-3 flex justify-around">
				<button
					name="answer"
					value="sabia"
					disabled={disabled}
					onClick={e => e.stopPropagation()}
				>
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

				<button
					name="answer"
					value="duvida"
					disabled={disabled}
					onClick={e => e.stopPropagation()}
				>
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
				<button
					name="answer"
					value="nao_sabia"
					disabled={disabled}
					onClick={e => e.stopPropagation()}
				>
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
	)
}

async function removeListAction({
	userId,
	formData,
	listId,
}: MyListsActionArgs) {
	const values = Object.fromEntries(formData)
	const id = String(values.id)
	const exists = await prisma.listsUsersFlashcards.findFirst({
		where: { flashcardId: id, list: { userId, id: listId } },
	})
	if (exists) {
		await prisma.listsUsersFlashcards.delete({
			where: {
				id: exists.id,
			},
		})
		let headers = await createToastHeaders({
			title: 'Flashcard removido da sua lista',
			description: 'O flashcard foi removido da sua lista com sucesso',
		})
		return json({ status: 'success' } as const, { headers })
	}
	return json(
		{ status: 'error', message: 'Flashcard not found in list' } as const,
		{ status: 400 },
	)
}
function RemoveFlashcardList({ flashcardId }: { flashcardId: string }) {
	const fetcher = useFetcher<typeof removeListAction>()
	const dc = useDoubleCheck()

	return (
		<fetcher.Form method="POST">
			<input type="hidden" hidden value={flashcardId} readOnly name="id" />
			<button
				{...dc.getButtonProps({
					type: 'submit',
					name: 'intent',
					value: removeListIntent,
					onClick: e => e.stopPropagation(),
				})}
				disabled={fetcher.state !== 'idle'}
				className={cn(
					'flex flex-col items-center ',
					dc.doubleCheck
						? 'rounded-md bg-red-500 p-1 text-white'
						: 'text-red-500 hover:text-red-700',
				)}
			>
				<Icon name="trash" className="h-6 w-6" />
				<span> {dc.doubleCheck ? `Tem Certeza?` : `Remover`}</span>
			</button>
		</fetcher.Form>
	)
}
