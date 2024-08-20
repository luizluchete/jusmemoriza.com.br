import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring, useSprings } from '@react-spring/web'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useSearchParams } from '@remix-run/react'
import { useState } from 'react'
import { Icon } from '#app/components/ui/icon'
import { MultiCombobox } from '#app/components/ui/multi-combobox'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, getUserImgSrc } from '#app/utils/misc'
import { BuscaMateriasParaFiltro, countFlashcards } from './flashcards.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		select: {
			name: true,
			image: { select: { id: true } },
		},
		where: { id: userId },
	})
	if (!user) invariantResponse(user, 'User not found', { status: 404 })
	const url = new URL(request.url)
	const materiaId = url.searchParams.getAll('materiaId')
	const flashcards = await prisma.flashcard.findMany({
		select: {
			id: true,
			frente: true,
			verso: true,
			fundamento: true,
			artigo: {
				select: {
					capitulo: {
						select: {
							titulo: {
								select: {
									lei: {
										select: {
											name: true,
											materia: { select: { color: true, name: true } },
										},
									},
								},
							},
						},
					},
				},
			},
		},
		take: 10,
	})
	const count = await countFlashcards({ userId })
	const materias = await BuscaMateriasParaFiltro()
	const mapper = flashcards.map(f => ({
		...f,
		materia: f.artigo.capitulo.titulo.lei.materia,
		lei: f.artigo.capitulo.titulo.lei,
	}))
	return json({ user, flashcards: mapper, count, materias })
}

export default function Page() {
	const { user, count } = useLoaderData<typeof loader>()
	const { duvida, naoSabia, sabia } = count

	const [searchParams, setSearchParams] = useSearchParams()

	function changeType(type: string) {
		const newParams = searchParams
		newParams.delete('page')
		type ? newParams.set('type', type) : newParams.delete('type')
		setSearchParams(newParams)
	}
	function calculateAngle(rating: number) {
		// O arco vai de -90 graus (0) a 90 graus (100)
		const angle = (rating / 100) * 180 - 90
		return angle
	}
	return (
		<div className="mx-auto mt-5 flex h-[720px] w-full justify-around">
			<CardFiltros />
			<Deck key={`deck-${searchParams.toString()}`} />
			<div className="flex h-full w-1/4 min-w-96 flex-col justify-between">
				<div className="flex items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4">
					<img
						src={getUserImgSrc(user.image?.id)}
						alt="avatar"
						className="h-9 w-9 rounded-xl object-cover"
					/>
					<span className="text-xl font-semibold">
						Olá, {user?.name.split(' ')[0]}!
					</span>
				</div>

				<div className="flex flex-col items-center justify-center space-y-10">
					<div className="relative">
						<div className="h-[119px] w-[238px] overflow-hidden">
							<div className="flex h-[238px] w-[238px] items-center justify-center rounded-full bg-gradient-to-r from-[#FF5757] via-[#7E9AFB] to-[#27DD86]">
								<div className="flex h-[212px] w-[212px] items-center justify-center rounded-full bg-white"></div>
							</div>
						</div>
						<div className="absolute top-0 flex h-[180px] w-[238px] items-center justify-center  text-black">
							<Icon
								name="rocket"
								className="h-12 w-12 origin-[25px_45px]"
								style={{ transform: `rotate(${calculateAngle(50)}deg)` }}
							/>
						</div>
					</div>

					<div className="flex flex-col items-center">
						<span className="text-2xl font-semibold">50% CONCLUÍDO</span>
						<span className="text-xl font-normal">Tempo Decorrido: 13:45</span>
					</div>
				</div>

				<div
					onClick={() => changeType('know')}
					className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<div
						id="card-sabia"
						className="flex h-11 w-11 items-center justify-center rounded-md bg-[#29DB89]  text-white"
					>
						{sabia.toString().padStart(2, '0')}
					</div>
					<span className="font-semibold">Sabia</span>
				</div>
				<div
					onClick={() => changeType('doubt')}
					className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<div
						id="card-duvida"
						className="flex h-11 w-11 items-center justify-center rounded-md bg-[#755FFF] text-white"
					>
						{duvida.toString().padStart(2, '0')}
					</div>
					<span className="font-semibold">Dúvida</span>
				</div>
				<div
					onClick={() => changeType('noknow')}
					className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<div
						id="card-nao-sabia"
						className="flex h-11 w-11 items-center justify-center rounded-md bg-[#F75B62] text-white"
					>
						{naoSabia.toString().padStart(2, '0')}
					</div>
					<span className="font-semibold">Não Sabia</span>
				</div>
				<div
					onClick={() => changeType('')}
					className="flex w-full cursor-pointer items-center justify-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<Icon name="stack-outline-light" className="h-8 w-8" />
					<span className="font-semibold">Baralho Principal</span>
				</div>
			</div>
		</div>
	)
}

function Deck() {
	const { flashcards } = useLoaderData<typeof loader>()
	const [localFlashcards] = useState(flashcards)
	const [springs, api] = useSprings(flashcards.length, i => ({
		from: { x: 0, scale: 1, y: -1000, opacity: 1 },
		scale: 1,
		x: 0,
		y: i > 4 ? 20 : i * 4,
		delay: i < 4 ? i * 100 : 400,
		config: { mass: 10, tension: 1000, friction: 300, duration: 600 },
	}))

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
		api.start(i => {
			if (flashcards[i].id !== flashcardId) return

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
		<div className="flex h-full w-5/12  flex-col justify-between">
			<div className="relative h-full">
				<div className="absolute flex w-full justify-center">{api.length}</div>
				{springs.map(({ scale, x, y }, index) => {
					const flashcard = localFlashcards[index]
					return (
						<animated.div
							id="deck-flashcards"
							key={index}
							className={cn(
								'absolute flex h-[95%] w-full min-w-96 justify-center',
							)}
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
function Card({
	frente,
	fundamento,
	id,
	verso,
	handleAnswer,
	materia,
	lei,
}: PropsCard) {
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
		<div className="relative h-full w-[484px]">
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

function CardFiltros() {
	const { count, materias } = useLoaderData<typeof loader>()
	const { total } = count

	const [searchParams] = useSearchParams()
	const materiaId = searchParams.getAll('materiaId')
	const searchMaterias = materias.filter(({ id }) => materiaId.includes(id))
	const [materiasSelected, setMateriasSelected] = useState(
		searchMaterias.map(({ id, name }) => ({ id, label: name })),
	)
	return (
		<div
			id="first-col"
			className="flex h-full w-1/4 min-w-96 flex-col space-y-10"
		>
			<div
				id="filtros"
				className="h-full w-full flex-1 space-y-10  overflow-y-auto rounded-2xl border border-gray-400 py-5"
			>
				<div className="flex w-full justify-center space-x-3">
					<Icon name="tabler-filter" className="h-5 w-5" />
					<span className="text-lg font-bold">Filtros</span>
				</div>

				<div className="flex w-full flex-col justify-center space-y-5 px-5">
					<MultiCombobox
						icon={<Icon name="single-book" className="h-5 w-5" />}
						placeholder="Matérias"
						name="materiaId"
						options={materias.map(({ id, name }) => ({ id, label: name }))}
						selectedValues={materiasSelected}
						setSelectedValues={setMateriasSelected}
					/>

					<MultiCombobox
						icon={<Icon name="lei" className="h-5 w-5" />}
						placeholder="Leis"
						name="leiId"
						options={[]}
						selectedValues={[]}
						setSelectedValues={() => {}}
					/>
				</div>

				<div className="flex w-full items-center justify-center">
					<span className="text-center text-lg font-bold">
						Filtros Selecionados:
					</span>
				</div>
			</div>
			<div className="flex w-full items-center justify-evenly space-x-3 rounded-xl border border-gray-400 p-4">
				<div className="flex flex-col justify-center text-center">
					<span className="font-semibold">Combo</span>
					<span className="text-gray-500">Trabalho</span>
				</div>
				<div className="h-11 border-l-2 border-gray-400" />
				<div className="flex flex-col justify-center text-center">
					<span className="font-semibold">Flashcards</span>
					<span className="text-gray-500">
						{total.toString().padStart(2, '0')}
					</span>
				</div>
			</div>
		</div>
	)
}
