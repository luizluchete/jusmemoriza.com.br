import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring, useSprings } from '@react-spring/web'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import {
	Link,
	Outlet,
	type ShouldRevalidateFunction,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ErrorList, TextareaField } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip'
import { requireUserId } from '#app/utils/auth.server'
import { getGlobalParams } from '#app/utils/config.server'
import { prisma } from '#app/utils/db.server'
import { sendEmail } from '#app/utils/email.server'
import { cn } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'
import {
	buscaMateriasParaFiltro,
	buscarFlashcardsPadrao,
	buscarFlashcardsPorTipo,
	countFlashcards,
} from './flashcards.server'

//intents flashcards
const intentAnswer = 'answer'
const ignorarFlashcardIntent = 'ignorarFlashcard'
const notifyErrorIntent = 'notifyError'

// Schemas zod
const answerFlashcardSchema = z.object({
	id: z.string(),
	answer: z.enum(['sabia', 'nao_sabia', 'duvida']),
})

const notifyErrorFlashcardSchema = z.object({
	flashcardId: z.string(),
	message: z
		.string({ required_error: 'Descreva o erro encontado' })
		.min(20, { message: 'Descreva em mais de 20 caracteres o erro encontrado' })
		.max(500, {
			message: 'Descreva em menos de 500 caracteres o erro encontrado',
		}),
})

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const tipo = url.searchParams.get('type')
	const leiId = url.searchParams.getAll('leiId')

	const materias = await buscaMateriasParaFiltro()

	const materiaId = url.searchParams.get('materiaId') || materias[0]?.id
	invariantResponse(materiaId, 'Materia not found', { status: 404 })

	const flashcards = tipo
		? await buscarFlashcardsPorTipo({ userId, tipo, materiaId, leiId, page })
		: await buscarFlashcardsPadrao({ userId, materiaId, leiId })

	const count = await countFlashcards({ userId, materiaId, leiId })

	return json({ flashcards, count })
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)
	const intent = formData.get('intent')
	if (intent === intentAnswer) {
		return answerCardAction(formData, userId)
	}

	if (intent === ignorarFlashcardIntent) {
		return ignorarFlashcardAction(formData, userId)
	}

	if (intent === notifyErrorIntent) {
		return notificarErroAction(formData, userId)
	}

	return json({ message: 'invalid intent' }, { status: 400 })
}

export const shouldRevalidate: ShouldRevalidateFunction = ({
	defaultShouldRevalidate,
	formMethod,
}) => {
	if (formMethod === 'POST') return false
	return defaultShouldRevalidate
}

export default function Page() {
	const [searchParams] = useSearchParams()
	return <Deck key={`deck-${searchParams.toString()}`} />
}

async function answerCardAction(formData: FormData, userId: string) {
	const submission = parseWithZod(formData, {
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

function Deck() {
	const { flashcards } = useLoaderData<typeof loader>()
	const [localFlashcards] = useState(flashcards)
	const [showResults, setShowResults] = useState(false)
	const [springs, api] = useSprings(localFlashcards.length, i => ({
		from: { x: 0, scale: 1, y: -1000, opacity: 1 },
		scale: 1,
		x: 0,
		y: i > 4 ? 25 : i * 5,
		delay: i < 4 ? i * 100 : 400,
		config: { mass: 10, tension: 1000, friction: 300, duration: 600 },
	}))
	const fetcher = useFetcher<typeof answerCardAction>()
	const [qtdeSabia, setQtdSabia] = useState(0)
	const [qtdeNaoSabia, setQtdeNaoSabia] = useState(0)
	const [qtdeDuvida, setQtdDuvida] = useState(0)
	const [searchParams, setSearchParams] = useSearchParams()

	function handleAnswer(answer: string, flashcardId: string) {
		const cardsRect = document
			.getElementById('deck-flashcards')
			?.getBoundingClientRect()
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
			fetcher.submit(
				{ intent: intentAnswer, id: flashcardId, answer },
				{ method: 'post' },
			)
		}, 600)

		api.start(i => {
			if (localFlashcards[i].id !== flashcardId) return

			if (cardsRect) {
				if (answer === 'sabia') {
					setQtdSabia(qtde => qtde + 1)
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
					setQtdDuvida(qtde => qtde + 1)

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
					setQtdeNaoSabia(qtde => qtde + 1)
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

		// Verifica se é o ultimo flashcard da pilha
		if (localFlashcards[0].id === flashcardId) {
			setTimeout(() => {
				setShowResults(true)
			}, 600)
		}
	}

	return (
		<>
			<div className="flex h-full w-[40%] flex-col justify-between">
				<div className="relative h-full">
					{localFlashcards.length === 0 ? (
						<div className="flex h-full w-full items-center justify-center">
							<span className="text-body-md">
								Nenhum flashcard encontrado !
							</span>
						</div>
					) : showResults ? (
						<div className="flex h-full w-full flex-col items-center justify-center space-y-5">
							<h3 className="text-4xl font-bold">Você chegou ao fim!</h3>
							<span className="text-xl font-semibold">
								Confira seus resultados:
							</span>
							<ul className="text-xl font-medium text-black/50">
								<li>Total de Flashcards: {localFlashcards.length}</li>
								<li>Sabia: {qtdeSabia}</li>
								<li>Dúvida: {qtdeDuvida}</li>
								<li>Não Sabia: {qtdeNaoSabia}</li>
							</ul>

							<Button
								className="h-14 w-full max-w-64 bg-[#29DB89] text-xl font-semibold hover:bg-[#29DB89] hover:brightness-95"
								onClick={() => {
									setSearchParams(prev => {
										let page = Number(searchParams.get('page')) || 1
										prev.set('page', (page + 1).toString())
										return prev
									})
								}}
							>
								Carregar mais
							</Button>
						</div>
					) : null}
					{springs.map(({ scale, x, y }, index) => {
						const flashcard = localFlashcards[index]
						return (
							<animated.div
								id="deck-flashcards"
								key={index}
								className={cn('absolute flex h-[90%] w-full justify-center')}
								style={{
									x,
									y,
									scale,
								}}
							>
								<Card {...flashcard} handleAnswer={handleAnswer} />
							</animated.div>
						)
					})}
				</div>

				{localFlashcards.length > 0 && !showResults ? (
					<div className="flex w-full items-center justify-center space-x-2">
						<Icon name="question-mark-circled" className="h-6 w-6" />
						<span className="text-lg font-normal">
							Clique na carta para girar
						</span>
					</div>
				) : null}
			</div>
			<Outlet />
		</>
	)
}

type PropsCard = {
	id: string
	frente: string
	verso: string
	fundamento?: string | null
	materia: {
		name: string
		color?: string | null
	}
	lei: {
		name: string
	}
	handleAnswer: (answer: string, flashcardId: string) => void
}
function Card({
	frente,
	id,
	verso,
	handleAnswer,
	fundamento,
	materia,
	lei,
}: PropsCard) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(1000px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})

	const [searchParams] = useSearchParams()

	const colorSabia = '#29DB89'
	const colorNaoSabia = '#F75B62'
	const colorDuvida = '#755FFF'
	const type = searchParams.get('type')

	function getColor() {
		if (type === 'know') {
			return colorSabia
		}

		if (type === 'doubt') {
			return colorDuvida
		}

		if (type === 'noknow') {
			return colorNaoSabia
		}
		return materia.color ?? 'gray'
	}

	function getIcon() {
		if (type === 'know') {
			return <Icon name="sabia-icon" className="h-44 w-44" />
		}

		if (type === 'doubt') {
			return <Icon name="duvida-icon" className="h-44 w-44" />
		}

		if (type === 'noknow') {
			return <Icon name="nao-sabia-icon" className="h-44 w-44" />
		}
		return (
			<Icon
				name="circle-wavy-question-fill"
				className="h-44 w-44"
				style={{ color: getColor() }}
			/>
		)
	}

	return (
		<div className="relative h-full max-h-[717px] w-full max-w-[484px] cursor-pointer transition-all duration-300 hover:-translate-y-2">
			<animated.div
				style={{ transform, transformStyle: 'preserve-3d' }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-3xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-3 backface-hidden "
			>
				<div
					className="flex h-full w-full flex-col items-center justify-around rounded-xl border-4 px-5"
					style={{ borderColor: getColor() }}
				>
					<div className="flex flex-col">
						{getIcon()}
						<h1
							className="text-center text-5xl font-extrabold"
							style={{ color: getColor() }}
						>
							{materia.name}
						</h1>
					</div>

					<div
						className="overflow-auto text-center text-2xl font-medium"
						dangerouslySetInnerHTML={{ __html: frente }}
					/>

					<h3 className="text-center text-xl font-semibold opacity-80">
						{lei.name}
					</h3>
				</div>
			</animated.div>
			<animated.div
				style={{ transform, rotateY: '180deg', transformStyle: 'preserve-3d' }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-3xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-3 backface-hidden"
			>
				<div
					className="flex h-full w-full flex-col items-center justify-start space-y-10 rounded-xl border-4 p-5"
					style={{ borderColor: getColor() }}
				>
					<div className="flex w-full justify-between">
						{fundamento ? (
							<FundamentoCard fundamento={fundamento} />
						) : (
							<div></div>
						)}
						<div className="flex space-x-1">
							<IgnorarFlashcard flashcardId={id} />
							<MinhasListas flashcardId={id} />
							<NotificarErro flashcardId={id} />
						</div>
					</div>

					<div className="flex h-full w-full flex-1 flex-col space-y-5">
						<span
							className="text-center text-5xl font-extrabold"
							style={{ color: getColor() }}
						>
							Resposta
						</span>

						<div
							className="overflow-auto text-center text-2xl font-medium"
							dangerouslySetInnerHTML={{ __html: verso }}
						/>
					</div>

					<div className="mt-3 flex w-full items-end justify-around">
						<button
							name="answer"
							value="sabia"
							onClick={e => {
								e.stopPropagation()
								handleAnswer('sabia', id)
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
							onClick={e => {
								e.stopPropagation()
								handleAnswer('duvida', id)
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
							onClick={e => {
								e.stopPropagation()
								handleAnswer('nao_sabia', id)
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
			</animated.div>
		</div>
	)
}

function FundamentoCard({ fundamento }: { fundamento: string }) {
	const [show, setShow] = useState(false)
	return (
		<>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger>
						<div
							className="flex items-center space-x-2"
							onClick={e => {
								e.stopPropagation()
								setShow(true)
							}}
						>
							<Icon name="books" className="h-6 w-6 text-black" />
							<span className="text-sm font-normal">Fundamento</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Veja o fundamento legal para a resposta do flashcard</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Dialog open={show} onOpenChange={setShow}>
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
		</>
	)
}

async function ignorarFlashcardAction(formData: FormData, userId: string) {
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
		{ sucess: 'ok' },
		{
			headers: await createToastHeaders({
				title: 'Sucesso',
				description: 'Flashcard enviado para a lixeira.',
			}),
		},
	)
}
function IgnorarFlashcard({ flashcardId }: { flashcardId: string }) {
	const fetcher = useFetcher<typeof ignorarFlashcardAction>()
	const [show, setShow] = useState(false)

	let isPending = fetcher.state === 'submitting'

	useEffect(() => {
		if (fetcher.data?.sucess === 'ok') {
			setShow(false)
		}
	}, [fetcher.data])

	return (
		<>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger>
						<div
							onClick={e => {
								e.stopPropagation()
								setShow(true)
							}}
						>
							<Icon name="trash" className="h-6 w-6" />
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Remover flashcard</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Dialog open={show} onOpenChange={setShow}>
				<DialogContent onClick={e => e.stopPropagation()}>
					<DialogHeader>
						<DialogTitle>Você tem certeza?</DialogTitle>
						<DialogDescription>
							Tem certeza de que deseja marcar este flashcard como excluído? Ele
							não aparecerá mais para você responder.
						</DialogDescription>
					</DialogHeader>

					<DialogFooter>
						<fetcher.Form method="post">
							<input
								type="hidden"
								name="intent"
								value={ignorarFlashcardIntent}
							/>
							<input type="hidden" name="id" value={flashcardId} />
							<Button type="submit" variant="destructive" disabled={isPending}>
								{isPending ? 'Excluindo...' : 'Excluir'}
							</Button>
						</fetcher.Form>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

function MinhasListas({ flashcardId }: { flashcardId: string }) {
	const [searchParams] = useSearchParams()
	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger>
					<Link
						onClick={e => {
							e.stopPropagation()
						}}
						to={`${flashcardId}/lists?${searchParams.toString()}`}
					>
						<Icon name="game-card" className="h-6 w-6" />
					</Link>
				</TooltipTrigger>
				<TooltipContent>
					<p>Minhas listas</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

async function notificarErroAction(form: FormData, userId: string) {
	const submission = await parseWithZod(form, {
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

	const configs = await getGlobalParams()
	if (configs && configs.notifyEmail) {
		const notifyEmail = configs.notifyEmail
		const user = await prisma.user.findFirst({
			select: { name: true, email: true },
			where: { id: userId },
		})
		if (!user) throw new Error('Usuário não encontrado')
		const flashcard = await prisma.flashcard.findFirst({
			where: { id: flashcardId },
		})
		await prisma.notifyError.create({
			data: { userMessage: message, flashcardId, userId },
		})
		const response = await sendEmail({
			subject: 'Erro em FLASHCARD reportado por usuário',
			to: notifyEmail,
			react: (
				<div>
					<h1>Erro em FLASHCARD reportado por usuário</h1>
					<p>
						Usuário: {user.name} ({user.email})
					</p>
					<p>Mensagem: {message}</p>
					<p>frente: {flashcard?.frente}</p>
					<p>verso: {flashcard?.verso}</p>
					<p>fundamento: {flashcard?.fundamento}</p>
					<p>foi incluido no sistema para verificação !</p>
				</div>
			),
		})

		if (response.status === 'success') {
			const headers = await createToastHeaders({
				description: 'Erro notificado com sucesso',
			})
			return json({ result: submission.reply() }, { headers })
		}
	}
	console.error(
		'configuração de envio de email não encontrada(NOTIFICAÇÃO DE FLASHCARDS)',
	)
	return json(
		{
			result: submission.reply({
				formErrors: ['Erro interno'],
			}),
		},
		{ status: 500 },
	)
}

function NotificarErro({ flashcardId }: { flashcardId: string }) {
	const [show, setShow] = useState(false)
	const fetcher = useFetcher<typeof notificarErroAction>()
	const isPending = fetcher.state === 'submitting'
	const [form, fields] = useForm({
		id: `notify-flashcard-${flashcardId}`,
		constraint: getZodConstraint(notifyErrorFlashcardSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: notifyErrorFlashcardSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	useEffect(() => {
		if (fetcher.data?.result?.status === 'success') {
			setShow(false)
		}
	}, [fetcher.data])

	return (
		<>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger>
						<div
							onClick={e => {
								e.stopPropagation()
								setShow(true)
							}}
						>
							<Icon name="flag" className="h-6 w-6" />
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Reportar problema/sugestão no flashcard</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<Dialog open={show} onOpenChange={setShow}>
				<DialogContent onClick={e => e.stopPropagation()}>
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
							<StatusButton status={isPending ? 'pending' : 'idle'}>
								{isPending ? 'Enviando...' : 'Enviar'}
							</StatusButton>
							<Button
								variant="destructive"
								type="button"
								onClick={() => setShow(false)}
							>
								Cancelar
							</Button>
						</div>
					</fetcher.Form>
				</DialogContent>
			</Dialog>
		</>
	)
}
