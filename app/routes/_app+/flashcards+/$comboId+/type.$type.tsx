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
	Form,
	Link,
	useSearchParams,
	type ClientLoaderFunctionArgs,
	type ClientActionFunctionArgs,
	useSubmit,
	Outlet,
	useNavigation,
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
import logoBranco from '#app/components/ui/img/logo_jusmemoriza_branco.png'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import './teste.css'
import { cn } from '#app/utils/misc'
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
	const tituloId = url.searchParams.getAll('tituloId')
	const capituloId = url.searchParams.getAll('capituloId')
	const artigoId = url.searchParams.getAll('artigoId')
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
	const titulosPromise = prisma.titulo.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			leiId: leiId.length ? { in: leiId } : undefined,
			lei: {
				combosLeis: { some: { comboId } },
				materiaId: materiaId.length ? { in: materiaId } : undefined,
			},
		},
	})
	const capitulosPromise = prisma.capitulo.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			tituloId: tituloId.length ? { in: tituloId } : undefined,
			titulo: {
				leiId: leiId.length ? { in: leiId } : undefined,
				lei: {
					combosLeis: { some: { comboId } },
					materiaId: materiaId.length ? { in: materiaId } : undefined,
				},
			},
		},
	})
	const artigosPromise = prisma.artigo.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			capituloId: capituloId.length ? { in: capituloId } : undefined,
			capitulo: {
				tituloId: tituloId.length ? { in: tituloId } : undefined,
				titulo: {
					leiId: leiId.length ? { in: leiId } : undefined,
					lei: {
						materiaId: materiaId.length ? { in: materiaId } : undefined,
						combosLeis: { some: { comboId } },
					},
				},
			},
		},
	})

	const [materias, leis, titulos, capitulos, artigos] = await Promise.all([
		materiasPromise,
		leisPromise,
		titulosPromise,
		capitulosPromise,
		artigosPromise,
	])

	const flashcards = await buscarFlashcards({
		comboId,
		userId,
		tipo: type,
		page,
		artigoId,
		capituloId,
		leiId,
		materiaId,
		tituloId,
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
		titulos,
		capitulos,
		artigos,
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
	const { flashcards } = useLoaderData<typeof loader>()
	let current = flashcards.at(-1)
	let flashcardFavorite = current?.favorite
	const [search] = useSearchParams()

	return (
		<>
			<Outlet />
			<div className="flex w-full flex-col items-center">
				<SheetFilterFlashcards title="Filtros" />
				<Deck key={`${type}${comboId}${search.toString()}`} />
				<div className="mt-5 flex w-full max-w-96 justify-around rounded-md shadow-md">
					<Form method="post">
						<input type="hidden" value={current?.id} name="id" readOnly />
						<input
							type="hidden"
							name="favorite"
							value={flashcardFavorite ? '' : 'yes'}
							readOnly
						/>
						<button type="submit" name="intent" value="favoritar">
							<div className="flex flex-col items-center text-primary hover:text-red-500">
								{flashcardFavorite ? (
									<Icon name="heart" className="h-6 w-6 text-red-500" />
								) : (
									<Icon name="heart-outline" className="h-6 w-6" />
								)}
								<span className={`${flashcardFavorite ? 'text-red-500' : ''}`}>
									Favoritar
								</span>
							</div>
						</button>
					</Form>
					<Link to={`lists/${current?.id}${search.toString()}`}>
						<div className="flex flex-col items-center text-primary hover:brightness-150">
							<Icon name="game-card" className="h-6 w-6" />
							<span>Listas</span>
						</div>
					</Link>
					{current?.fundamento ? (
						<Dialog>
							<DialogTrigger>
								<div className="flex cursor-pointer flex-col items-center text-primary hover:brightness-150">
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
												__html: current.fundamento || '',
											}}
										/>
									</DialogDescription>
								</DialogHeader>
							</DialogContent>
						</Dialog>
					) : null}
				</div>
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
		from: { x: 0, rot: 0, scale: 1, y: -1000, opacity: 1 },
		scale: 1,
		x: 0,
		y: i < 4 ? i * -4 : -4,
		rot: -1 + Math.random() * 5,
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
				springs.map(({ scale, x, y, rot }, index) => (
					<animated.div
						id="cards"
						key={flashcards[index].id}
						className="absolute"
						style={{
							x,
							y,
							scale,
							transform: rot.to(r => `rotate(${r}deg)`),
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

	const { frente, verso, id, materia, lei } = flashcard
	const { type } = useParams()
	const navigation = useNavigation()
	let isPeding =
		navigation.state === 'submitting' || navigation.state === 'loading'
	function getColorBackground() {
		if (type === 'know') {
			return 'bg-green-900'
		}
		if (type === 'noknow') {
			return 'bg-red-900'
		}
		if (type === 'doubt') {
			return 'bg-purple-900'
		}
		return 'bg-primary'
	}

	return (
		<div className="relative flex h-[600px] w-[440px]">
			<animated.div
				className={cn(
					'absolute flex h-full w-full flex-col space-y-3 rounded-lg border border-black p-3 backface-hidden',
					getColorBackground(),
				)}
				style={{ transform }}
			>
				<div className="flex items-center">
					<h2 className="flex-1 text-lg font-bold text-gray-300">
						{materia.name}
					</h2>

					<img
						src={logoBranco}
						alt="logo JusMemoriza"
						className="h-10 object-cover"
					/>
				</div>
				<div
					id="texto-frente"
					className="flex-1 whitespace-normal rounded-lg bg-white px-3 pt-5"
				>
					<h3 className="text-xl font-bold">{lei.name}</h3>

					<div
						className="max-h-72 overflow-auto text-justify text-xl"
						dangerouslySetInnerHTML={{ __html: frente }}
					/>
				</div>
				<div className="flex w-full justify-center">
					<button onClick={() => setFlipped(prev => !prev)}>
						<div className="flex items-center gap-x-3 rounded-md bg-gray-300 px-6 py-3 text-base font-medium text-black shadow-sm hover:brightness-90">
							<Icon name="question-mark-circled" className="h-7 w-7" />
							<span>Ver Resposta</span>
						</div>
					</button>
				</div>
			</animated.div>

			<animated.div
				className="absolute flex h-full w-full flex-col rounded-lg border border-black bg-gray-200 p-3 backface-hidden"
				style={{ transform, rotateY: '180deg' }}
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
						className="h-full overflow-auto text-justify text-xl"
						dangerouslySetInnerHTML={{ __html: verso }}
					/>
				</div>
				<div>
					<input type="hidden" name="id" readOnly value={id} />
					<input type="hidden" name="intent" value="answer" readOnly />
					<div className="w-ful mt-3 flex justify-around">
						<button
							name="answer"
							value="sabia"
							disabled={isPeding}
							onClick={() => handleAnswer('sabia', id)}
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
							onClick={() => handleAnswer('duvida', id)}
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
							onClick={() => handleAnswer('nao_sabia', id)}
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
			</animated.div>
		</div>
	)
}
