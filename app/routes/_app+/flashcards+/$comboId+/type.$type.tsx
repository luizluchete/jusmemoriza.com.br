import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	Dialog as DialogHeadless,
	DialogBackdrop as DialogBackdropHeadless,
	DialogPanel as DialogPanelHeadless,
} from '@headlessui/react'
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
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { TextareaField, ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
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
import { StatusButton } from '#app/components/ui/status-button'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, useDoubleCheck, useIsPending } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'
import { SheetFilterFlashcards } from './__filtro-flashcards'
import { buscarFlashcards, notifyErrorFlashcard } from './flashcards.server'

type FlashcardsActionArgs = {
	request: Request
	userId: string
	formData: FormData
}

const favoriteFlashcardSchema = z.object({
	id: z.string(),
	favorite: z.coerce.boolean(),
})
const answerFlashcardSchema = z.object({
	id: z.string(),
	answer: z.enum(['sabia', 'nao_sabia', 'duvida']),
})

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

const intentAnswer = 'answer'
const intentFavorite = 'favoritar'
const ignorarFlashcardIntent = 'ignorarFlashcard'
const notifyErrorIntent = 'notifyError'
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const form = await request.formData()
	const { intent } = Object.fromEntries(form)

	if (intent === intentAnswer) {
		const submission = parseWithZod(form, {
			schema: answerFlashcardSchema,
		})
		if (submission.status !== 'success') {
			return json({ result: submission.reply() }, { status: 400 })
		}
		const { id, answer } = submission.value
		await prisma.flashcardUserAnswers.create({
			data: { answer, flashcardId: id, userId },
		})
		return json({ result: submission.reply() })
	}

	if (intent === intentFavorite) {
		const submission = parseWithZod(form, {
			schema: favoriteFlashcardSchema,
		})
		if (submission.status !== 'success') {
			return json({ result: submission.reply() }, { status: 400 })
		}
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

	if (intent === notifyErrorIntent) {
		return reportErrorFlashcardAction({ request, userId, formData: form })
	}

	if (intent === ignorarFlashcardIntent) {
		return ignorarFlashcardAction({ request, userId, formData: form })
	}

	throw new Response(`Invalid intent "${intent}"`, { status: 400 })
}

export async function clientAction({
	serverAction,
	request,
}: ClientActionFunctionArgs) {
	const form = await request.clone().formData()
	const values = Object.fromEntries(form)

	if (values.intent === intentAnswer) {
		const { id } = values
		const cachedData = (await localForage.getItem(cachedKeyData)) as any
		if (cachedData && Array.isArray(cachedData.flashcards)) {
			const index = cachedData.flashcards.findIndex((f: any) => f.id === id)
			cachedData.flashcards.splice(index, 1)
			await localForage.setItem(cachedKeyData, cachedData)
		}
		return serverAction()
	}

	if (values.intent === intentFavorite) {
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

	if (values.intent === ignorarFlashcardIntent) {
		const { id } = values
		const cachedData = (await localForage.getItem(cachedKeyData)) as any
		if (cachedData && Array.isArray(cachedData.flashcards)) {
			const index = cachedData.flashcards.findIndex((f: any) => f.id === id)

			await localForage.setItem(
				cachedKeyData,
				cachedData.flashcards.slice(index, 1),
			)
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
				{ intent: intentAnswer, id, answer },
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

	let [search] = useSearchParams()
	const navigation = useNavigation()
	let isPeding =
		navigation.state === 'submitting' || navigation.state === 'loading'

	const { type } = useParams()

	function borderColor() {
		if (type === 'know') {
			return '#DAEBD1'
		}

		if (type === 'doubt') {
			return 'rgb(168 85 247 / 0.2)'
		}

		if (type === 'noknow') {
			return '#F8D8DE'
		}
		return flashcard.materia.color ?? 'gray'
	}

	function returnIcon() {
		if (type === 'know') {
			return (
				<Icon
					name="emoji-acertei"
					className={cn(
						'h-24 w-24 rounded-full bg-[#DAEBD1] object-cover text-[#007012]',
					)}
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
					style={{ borderColor: cn(borderColor()) }}
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
					style={{ borderColor: cn(borderColor()) }}
				>
					<div className="flex w-full justify-end space-x-3 p-2">
						<IgnorarFlashcard flashcardId={flashcard.id} />
						<ReportErrorFlashcard flashcardId={flashcard.id} />
						<Link
							to={`lists/${flashcard.id}?${search.toString()}`}
							onClick={e => e.stopPropagation()}
						>
							<div className="flex flex-col items-center text-primary transition-all duration-100 hover:scale-105 hover:brightness-150">
								<Icon name="game-card" className="h-6 w-6" />
								<span>Listas</span>
							</div>
						</Link>
						{flashcard.fundamento ? (
							<Dialog>
								<DialogTrigger onClick={e => e.stopPropagation()}>
									<div className="flex cursor-pointer flex-col items-center text-primary transition-all duration-100 hover:scale-105 hover:brightness-150">
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
								<div className="flex flex-col items-center transition-all duration-100 hover:scale-105 hover:text-[#007012]">
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
								<div className="flex flex-col items-center transition-all duration-100 hover:scale-105 hover:text-primary">
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
								<div className="flex flex-col items-center transition-all duration-100 hover:scale-105 hover:text-red-500">
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

const notifyErrorFlashcardSchema = z.object({
	intent: z.literal(notifyErrorIntent),
	flashcardId: z.string(),
	message: z
		.string({ required_error: 'Descreva o erro encontado' })
		.min(20, { message: 'Descreva em mais de 20 caracteres o erro encontrado' })
		.max(500, {
			message: 'Descreva em menos de 500 caracteres o erro encontrado',
		}),
})

async function reportErrorFlashcardAction({
	formData,
	userId,
}: FlashcardsActionArgs) {
	const submission = await parseWithZod(formData, {
		schema: notifyErrorFlashcardSchema.superRefine(async (data, ctx) => {
			const { flashcardId } = data
			const existsNotify = await prisma.notifyError.findFirst({
				where: { fixed: false, flashcardId, userId },
			})
			if (existsNotify) {
				ctx.addIssue({
					path: [''],
					code: z.ZodIssueCode.custom,
					message:
						'Você já possui uma notificação de erro para este flashcard em aberto. Aguarde a verificação da equipe !',
				})
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}
	const { flashcardId, message } = submission.value
	await notifyErrorFlashcard(flashcardId, userId, message)
	const headers = await createToastHeaders({
		description: 'Erro notificado com sucesso',
	})
	return json({ result: submission.reply() }, { headers })
}

function ReportErrorFlashcard({ flashcardId }: { flashcardId: string }) {
	const [openNotifyError, setOpenNotifyError] = useState(false)
	const fetcher = useFetcher<typeof reportErrorFlashcardAction>()
	const [form, fields] = useForm({
		id: `notify-flashcard-${flashcardId}`,
		constraint: getZodConstraint(notifyErrorFlashcardSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: notifyErrorFlashcardSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const isPeding = useIsPending({ state: 'submitting' })

	useEffect(() => {
		if (fetcher.data?.result?.status === 'success') {
			setOpenNotifyError(false)
		}
	}, [fetcher.data])
	return (
		<>
			<button
				onClick={e => {
					e.stopPropagation()
					setOpenNotifyError(true)
				}}
			>
				<div className="flex w-min cursor-pointer flex-col text-primary transition-all duration-100 hover:scale-105">
					<Icon name="flag" className="h-6 w-6" />
					<span className="w-max">Notificar Erro</span>
				</div>
			</button>
			<DialogHeadless
				className="relative z-10"
				open={openNotifyError}
				onClose={setOpenNotifyError}
			>
				<DialogBackdropHeadless
					transition
					className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
				/>

				<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
					<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
						<DialogPanelHeadless
							transition
							className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
						>
							<div>
								<fetcher.Form
									method="post"
									{...getFormProps(form)}
									className="space-y-1"
								>
									<TextareaField
										labelProps={{
											children: 'Descreva o erro encontrado',
										}}
										textareaProps={{
											...getInputProps(fields.message, { type: 'text' }),
										}}
										errors={fields.message.errors}
									/>
									<ErrorList errors={form.errors} id={form.errorId} />
									<input
										type="hidden"
										name="flashcardId"
										value={flashcardId}
										readOnly
									/>
									<input
										type="hidden"
										name="intent"
										value={notifyErrorIntent}
										readOnly
									/>
									<div className="flex space-x-2">
										<StatusButton status={isPeding ? 'pending' : 'idle'}>
											{isPeding ? 'Enviando...' : 'Enviar'}
										</StatusButton>
										<Button
											variant="destructive"
											type="button"
											onClick={() => setOpenNotifyError(false)}
										>
											Cancelar
										</Button>
									</div>
								</fetcher.Form>
							</div>
						</DialogPanelHeadless>
					</div>
				</div>
			</DialogHeadless>
		</>
	)
}

async function ignorarFlashcardAction({
	formData,
	request,
	userId,
}: FlashcardsActionArgs) {
	const values = Object.fromEntries(formData)

	const id = String(values.id)

	const exists = await prisma.flashcardIgnore.findFirst({
		where: { flashcardId: id, userId },
	})
	if (!exists) {
		await prisma.flashcardIgnore.create({
			data: { flashcardId: id, userId },
		})
	}
	return json(
		{ result: 'sucess' },
		{
			headers: await createToastHeaders({
				title: 'Flashcard movido para sua lixeira',
				description: 'O flashcard não será mais exibido para você',
			}),
		},
	)
}
function IgnorarFlashcard({ flashcardId }: { flashcardId: string }) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()

	return (
		<fetcher.Form method="POST">
			<input type="hidden" hidden value={flashcardId} readOnly name="id" />
			<button
				{...dc.getButtonProps({
					type: 'submit',
					name: 'intent',
					value: ignorarFlashcardIntent,
					onClick: e => e.stopPropagation(),
				})}
				disabled={fetcher.state !== 'idle'}
				className={cn(
					'flex flex-col items-center transition-all duration-100 hover:scale-105',
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
