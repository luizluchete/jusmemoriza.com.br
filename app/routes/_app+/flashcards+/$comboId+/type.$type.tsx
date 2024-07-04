import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring, useSprings } from '@react-spring/web'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	useLoaderData,
	useParams,
	Link,
	useSearchParams,
	type ClientLoaderFunctionArgs,
	type ClientActionFunctionArgs,
	useSubmit,
	Outlet,
	useNavigation,
	useFetcher,
} from '@remix-run/react'
import localForage from 'localforage'
import { useState } from 'react'
import { z } from 'zod'
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
import { SheetFilterFlashcards } from './__filtro-flashcards'
import { buscarFlashcards } from './flashcards.server'

const favoriteFlashcardSchema = z.object({
	intent: z.literal('favoritar'),
	id: z.string(),
	favorite: z.coerce.boolean(),
})
const answerFlashcardSchema = z.object({
	intent: z.literal('answer'),
	id: z.string(),
	answer: z.enum(['sabia', 'nao_sabia', 'duvida']),
})
const flashcardSChema = z.discriminatedUnion('intent', [
	favoriteFlashcardSchema,
	answerFlashcardSchema,
])
export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const comboId = params.comboId
	invariantResponse(comboId, 'ComboId is required', { status: 404 })
	const type = params.type
	invariantResponse(type, 'type is required', { status: 404 })
	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const materiaId = url.searchParams.getAll('materiaId')
	const leiId = url.searchParams.getAll('leiId')
	const onlyFavorites = url.searchParams.get('favorite') === 'on'

	const materiasPromise = prisma.materia.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			Lei: { some: { combosLeis: { some: { comboId } } } },
		},
	})
	const leisPromise = prisma.lei.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			combosLeis: { some: { comboId } },
			materiaId: materiaId.length ? { in: materiaId } : undefined,
		},
	})

	const [materias, leis] = await Promise.all([materiasPromise, leisPromise])

	const flashcards = await buscarFlashcards({
		comboId,
		userId,
		tipo: type,
		page,
		leiId,
		materiaId,
		onlyFavorites,
	})
	return json({
		flashcards: flashcards.map(f => ({
			id: f.id,
			frente: f.frente,
			verso: f.verso,
			fundamento: f.fundamento,
			materia: f.materia,
			lei: f.lei,
			favorite: f.favorite,
		})),
		materias,
		leis,
	})
}

let isInitialRequest = true
const cachedKeyData = 'cached-data'
const cachedKeypage = 'keyPage'
export async function clientLoader({
	serverLoader,
	request,
	params,
}: ClientLoaderFunctionArgs) {
	const type = params.type
	const comboId = params.comboId

	const url = new URL(request.url)

	const cachedPage = `${type}${comboId}${url.search}`
	if (isInitialRequest) {
		isInitialRequest = false
		await localForage.setItem(cachedKeypage, cachedPage)
		const serverData = await serverLoader<typeof loader>()
		await localForage.setItem(cachedKeyData, serverData)
		return serverData
	}
	const hrefCached = await localForage.getItem(cachedKeypage)

	if (cachedPage !== hrefCached) {
		await localForage.clear()
		await localForage.setItem(cachedKeypage, cachedPage)
		const serverData = await serverLoader<typeof loader>()
		await localForage.setItem(cachedKeyData, serverData)
		return serverData
	}

	const dataCached = (await localForage.getItem(cachedKeyData)) as any
	if (
		dataCached &&
		Array.isArray(dataCached.flashcards) &&
		dataCached.flashcards.length > 0
	) {
		return dataCached
	}

	const serverData = await serverLoader<typeof loader>()
	await localForage.setItem(cachedKeyData, serverData)
	return serverData
}
clientLoader.hydrate = true

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const form = await request.formData()

	const submission = parseWithZod(form, {
		schema: flashcardSChema,
	})

	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}

	const { intent } = submission.value
	if (intent === 'answer') {
		const { id, answer } = submission.value
		await prisma.flashcardUserAnswers.create({
			data: { answer, flashcardId: id, userId },
		})
		return json({ result: submission.reply() })
	}

	if (intent === 'favoritar') {
		const { id, favorite } = submission.value
		const exists = await prisma.flashcardUserFavorites.findFirst({
			where: { flashcardId: id, userId },
		})
		if (exists && !favorite) {
			await prisma.flashcardUserFavorites.delete({
				where: { flashcardId_userId: { flashcardId: id, userId } },
			})
			return json({ result: submission.reply() })
		}

		if (!exists && favorite) {
			await prisma.flashcardUserFavorites.create({
				data: { flashcardId: id, userId },
			})
			return json({ result: submission.reply() })
		}
	}

	return json({})
}

export async function clientAction({
	serverAction,
	request,
}: ClientActionFunctionArgs) {
	const form = await request.clone().formData()
	const values = Object.fromEntries(form)

	if (values.intent === 'answer') {
		const { id } = values
		const cachedData = (await localForage.getItem(cachedKeyData)) as any
		if (cachedData && Array.isArray(cachedData.flashcards)) {
			const index = cachedData.flashcards.findIndex((f: any) => f.id === id)
			cachedData.flashcards.splice(index, 1)
			await localForage.setItem(cachedKeyData, cachedData)
		}
		return serverAction()
	}

	if (values.intent === 'favoritar') {
		const { id, favorite } = values
		const cachedData = (await localForage.getItem(cachedKeyData)) as any
		if (cachedData && Array.isArray(cachedData.flashcards)) {
			const index = cachedData.flashcards.findIndex((f: any) => f.id === id)
			cachedData.flashcards[index] = {
				...(cachedData.flashcards[index] as any),
				favorite,
			}
			await localForage.setItem(cachedKeyData, cachedData)
		}
	}

	return serverAction()
}

export default function Flashcards() {
	const { comboId, type } = useParams()
	const [search] = useSearchParams()
	return (
		<>
			<Outlet />
			<div className="flex w-full flex-col items-center">
				<SheetFilterFlashcards title="Filtros" />
				<Deck key={`${type}${comboId}${search.toString()}`} />
			</div>
		</>
	)
}

function Deck() {
	const { flashcards } = useLoaderData<typeof loader>()
	const submit = useSubmit()
	const { type } = useParams()
	const [searchParams, setSearchParams] = useSearchParams()
	const [springs, api] = useSprings(flashcards.length, i => ({
		from: { x: 0, scale: 1, y: -1000, opacity: 1 },
		scale: 1,
		x: 0,
		y: i > 4 ? 20 : i * 4,
		delay: i < 4 ? i * 100 : 400,
		display: 'block',
		config: { mass: 10, tension: 1000, friction: 300, duration: 600 },
	}))
	function handleAnswerAnimation(answer: string, id: string) {
		const cardsRect = document.getElementById('cards')?.getBoundingClientRect()
		const cardSabiaRect = document
			.getElementById('card-sabia')
			?.getBoundingClientRect()
		const cardDuvidaRect = document
			.getElementById('card-duvida')
			?.getBoundingClientRect()
		const cardNaoSabia = document
			.getElementById('card-nao-sabia')
			?.getBoundingClientRect()

		setTimeout(() => {
			submit(
				{ intent: 'answer', id, answer },
				{ method: 'post', navigate: false },
			)
		}, 600)
		api.start(i => {
			if (flashcards[i].id !== id) return

			if (cardsRect) {
				if (answer === 'sabia') {
					if (cardSabiaRect) {
						const x =
							cardSabiaRect.x -
							cardsRect.x +
							(cardSabiaRect.width - cardSabiaRect.width) / 2

						const y =
							cardSabiaRect.y -
							cardsRect.y +
							(cardSabiaRect.height - cardsRect.height) / 2
						return { x, y, scale: 0, leave: { display: 'none' } }
					}
				}
				if (answer === 'duvida') {
					if (cardDuvidaRect) {
						const x =
							cardDuvidaRect.x -
							cardsRect.x +
							(cardDuvidaRect.width - cardDuvidaRect.width) / 2
						const y =
							cardDuvidaRect.y -
							cardsRect.y +
							(cardDuvidaRect.height - cardsRect.height) / 2
						return { x, y, scale: 0 }
					}
				}
				if (answer === 'nao_sabia') {
					if (cardNaoSabia) {
						const x =
							cardNaoSabia.x -
							cardsRect.x +
							(cardNaoSabia.width - cardNaoSabia.width) / 2
						const y =
							cardNaoSabia.y -
							cardsRect.y +
							(cardNaoSabia.height - cardsRect.height) / 2

						return { x, y, scale: 0 }
					}
				}
			}

			return { x: 300, scale: 0 }
		})
		if (flashcards.length === 1) {
			let page = Number(searchParams.get('page')) || 1
			setTimeout(() => {
				setSearchParams(prev => {
					prev.set('page', (page + 1).toString())
					return prev
				})
				submit(`${searchParams.toString()}`)
			}, 400)
		}
	}

	function MessageNoFlashcards() {
		let message = 'Nenhum flashcard encontrado'
		if (type === 'initial') {
			message = 'Nenhum flashcard encontrado na pilha inicial'
		} else if (type === 'know') {
			message = 'Nenhum flashcard encontrado na pilha de acertos'
		} else if (type === 'noknow') {
			message = 'Nenhum flashcard encontrado na pilha de erros'
		} else if (type === 'doubt') {
			message = 'Nenhum flashcard encontrado na pilha de dúvidas'
		}

		return <div>{message}</div>
	}

	return (
		<div className="mt-5 flex h-[600px] w-full justify-center">
			{flashcards.length === 0 ? (
				<MessageNoFlashcards />
			) : (
				springs.map(({ scale, x, y }, index) => (
					<animated.div
						id="cards"
						key={flashcards[index].id}
						className="absolute"
						style={{
							x,
							y,
							scale,
						}}
					>
						<Flashcard
							flashcard={flashcards[index]}
							handleAnswer={handleAnswerAnimation}
						/>
					</animated.div>
				))
			)}
		</div>
	)
}

function Flashcard({
	flashcard,
	handleAnswer,
}: {
	handleAnswer: (answer: string, id: string) => void
	flashcard: {
		id: string
		frente: string
		verso: string
		fundamento?: string | null
		favorite: boolean
		materia: {
			name: string
			color?: string | null
		}
		lei: { name: string }
	}
}) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})

	let fetcher = useFetcher()
	let [search] = useSearchParams()
	const navigation = useNavigation()
	let isPeding =
		navigation.state === 'submitting' || navigation.state === 'loading'

	const { type } = useParams()

	function returnIcon() {
		if (type === 'know') {
			return (
				<Icon
					name="emoji-acertei"
					className="h-24 w-24 rounded-full bg-[#DAEBD1] object-cover text-[#007012]"
				/>
			)
		}

		if (type === 'doubt') {
			return (
				<Icon
					name="emoji-duvida"
					className="h-24 w-24 rounded-full bg-purple-500/20 object-cover text-primary"
				/>
			)
		}

		if (type === 'noknow') {
			return (
				<Icon
					name="emoji-errei"
					className="h-24 w-24 rounded-full bg-[#F8D8DE] object-cover text-red-500"
				/>
			)
		}

		return (
			<div
				className="flex h-24 w-24 items-center justify-center rounded-full p-4 shadow-xl"
				style={{ backgroundColor: flashcard.materia.color ?? 'gray' }}
			>
				<Icon
					name="question"
					className="h-full w-full rounded-full object-cover text-white"
				/>
			</div>
		)
	}
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
					style={{ borderColor: flashcard.materia.color ?? 'gray' }}
				>
					<div className="mt-20 flex w-full flex-col items-center justify-center space-y-5">
						{returnIcon()}

						<h1 className="text-3xl font-bold">{flashcard.materia.name}</h1>
						<div
							className="flex-1 overflow-auto px-5 text-justify text-xl text-gray-600"
							dangerouslySetInnerHTML={{ __html: flashcard.frente }}
						/>
					</div>
					<div className="flex w-full justify-center">
						<h2 className="mb-5 text-2xl font-semibold text-gray-600">
							{flashcard.lei.name}
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
					style={{ borderColor: flashcard.materia.color ?? 'gray' }}
				>
					<div className="flex w-full justify-end space-x-5 p-2">
						<fetcher.Form method="post">
							<input type="hidden" value={flashcard.id} name="id" readOnly />
							<input
								type="hidden"
								name="favorite"
								value={flashcard.favorite ? '' : 'yes'}
								readOnly
							/>
							<button
								type="submit"
								name="intent"
								value="favoritar"
								onClick={e => e.stopPropagation()}
							>
								<div className="flex flex-col items-center text-primary hover:text-red-500">
									{flashcard.favorite ? (
										<Icon name="heart" className="h-6 w-6 text-red-500" />
									) : (
										<Icon name="heart-outline" className="h-6 w-6" />
									)}
									<span
										className={`${flashcard.favorite ? 'text-red-500' : ''}`}
									>
										Favoritar
									</span>
								</div>
							</button>
						</fetcher.Form>
						<Link
							to={`lists/${flashcard.id}?${search.toString()}`}
							onClick={e => e.stopPropagation()}
						>
							<div className="flex flex-col items-center text-primary hover:brightness-150">
								<Icon name="game-card" className="h-6 w-6" />
								<span>Listas</span>
							</div>
						</Link>
						{flashcard.fundamento ? (
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
													__html: flashcard.fundamento,
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
							dangerouslySetInnerHTML={{ __html: flashcard.verso }}
						/>
					</div>
					<div>
						<input type="hidden" name="id" readOnly value={flashcard.id} />
						<input type="hidden" name="intent" value="answer" readOnly />
						<div className="w-ful mt-3 flex justify-around">
							<button
								name="answer"
								value="sabia"
								disabled={isPeding}
								onClick={e => {
									e.stopPropagation()
									handleAnswer('sabia', flashcard.id)
								}}
							>
								<div className="flex flex-col items-center hover:text-[#007012]">
									<Icon
										name="emoji-acertei"
										className="h-12 w-12  rounded-full hover:bg-[#DAEBD1]"
									/>
									<span>Acertei</span>
								</div>
							</button>

							<button
								name="answer"
								value="duvida"
								disabled={isPeding}
								onClick={e => {
									e.stopPropagation()
									handleAnswer('duvida', flashcard.id)
								}}
							>
								<div className="flex flex-col items-center hover:text-primary">
									<div className="h-12 w-12 rounded-full hover:bg-purple-500/10">
										<Icon name="emoji-duvida" className="h-12 w-12" />
									</div>
									<span>Dúvida</span>
								</div>
							</button>
							<button
								name="answer"
								value="nao_sabia"
								disabled={isPeding}
								onClick={e => {
									e.stopPropagation()
									handleAnswer('nao_sabia', flashcard.id)
								}}
							>
								<div className="flex flex-col items-center hover:text-red-500 ">
									<Icon
										name="emoji-errei"
										className="h-12 w-12 rounded-full hover:bg-[#F8D8DE]"
									/>
									<span>Não Sabia</span>
								</div>
							</button>
						</div>
					</div>
				</div>
			</animated.div>
		</div>
	)
}
