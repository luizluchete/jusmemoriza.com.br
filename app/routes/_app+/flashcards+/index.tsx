import { parseWithZod } from '@conform-to/zod'
import { animated, useSpring, useSprings } from '@react-spring/web'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import {
	type ShouldRevalidateFunction,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn } from '#app/utils/misc'
import {
	buscaLeisParaFiltro,
	buscaMateriasParaFiltro,
	buscarFlashcardsPadrao,
	buscarFlashcardsPorTipo,
	countFlashcards,
} from './flashcards.server'

//intents flashcards
const intentAnswer = 'answer'
// const ignorarFlashcardIntent = 'ignorarFlashcard'
// const notifyErrorIntent = 'notifyError'

// Schemas zod
const answerFlashcardSchema = z.object({
	id: z.string(),
	answer: z.enum(['sabia', 'nao_sabia', 'duvida']),
})

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const tipo = url.searchParams.get('type')
	const materiaId = url.searchParams.getAll('materiaId')
	const leiId = url.searchParams.getAll('leiId')

	const flashcards = tipo
		? await buscarFlashcardsPorTipo({ userId, tipo, materiaId, leiId, page })
		: await buscarFlashcardsPadrao({ userId, materiaId, leiId })

	const count = await countFlashcards({ userId, materiaId, leiId })
	const materias = await buscaMateriasParaFiltro()
	const leis =
		materiaId.length > 0 ? await buscaLeisParaFiltro(materiaId) : undefined
	return json({ flashcards, count, materias, leis })
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)
	const intent = formData.get('intent')
	if (intent === intentAnswer) {
		return answerCardAction(formData, userId)
	}
	return null
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
	const [springs, api] = useSprings(localFlashcards.length, i => ({
		from: { x: 0, scale: 1, y: -1000, opacity: 1 },
		scale: 1,
		x: 0,
		y: i > 4 ? 25 : i * 5,
		delay: i < 4 ? i * 100 : 400,
		config: { mass: 10, tension: 1000, friction: 300, duration: 600 },
	}))
	const fetcher = useFetcher<typeof answerCardAction>()

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
	}

	return (
		<div className="flex h-full w-[30%] flex-col justify-between">
			<div className="relative h-full">
				{springs.map(({ scale, x, y }, index) => {
					const flashcard = localFlashcards[index]
					return (
						<animated.div
							id="deck-flashcards"
							key={index}
							className={cn('absolute flex h-[95%] w-full justify-center')}
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

			<div className="flex w-full items-center justify-center space-x-2">
				<Icon name="question-mark-circled" className="h-6 w-6" />
				<span className="text-lg font-normal">Clique na carta para girar</span>
			</div>
		</div>
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
function Card({ frente, id, verso, handleAnswer, materia, lei }: PropsCard) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
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
		<div className="relative h-full w-full">
			<animated.div
				style={{ transform }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-3xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-3 backface-hidden"
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
				style={{ transform, rotateY: '180deg' }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-3xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-3 backface-hidden"
			>
				<div
					className="flex h-full w-full flex-col items-center justify-start space-y-10 rounded-xl border-4 p-5"
					style={{ borderColor: getColor() }}
				>
					<div className="flex w-full justify-between">
						<div className="flex items-center space-x-2">
							<Icon name="books" className="h-6 w-6 text-black" />
							<span className="text-sm font-normal">Fundamento</span>
						</div>
						<div className="flex space-x-1">
							<Icon name="trash" className="h-6 w-6" />
							<Icon name="game-card" className="h-6 w-6" />
							<Icon name="flag" className="h-6 w-6" />
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
