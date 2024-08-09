import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring } from '@react-spring/web'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import { Icon } from '#app/components/ui/icon'
import { MultiCombobox } from '#app/components/ui/multi-combobox'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, getUserImgSrc } from '#app/utils/misc'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		select: {
			name: true,
			image: { select: { id: true } },
		},
		where: { id: userId },
	})
	if (!user) invariantResponse(user, 'Not found', { status: 404 })
	return json({ user })
}

export default function Page() {
	function calculateAngle(rating: number) {
		// O arco vai de -90 graus (0) a 90 graus (100)
		const angle = (rating / 100) * 180 - 90
		return angle
	}
	const { user } = useLoaderData<typeof loader>()
	return (
		<div className="mx-auto flex h-[800px] w-full max-w-screen-2xl justify-between ">
			<CardFiltros />

			<div
				id="deck"
				className="flex h-full w-[550px] flex-col justify-between overflow-hidden"
			>
				<div className="relative h-full ">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className={cn('absolute')}
							style={{
								top: `${i * 10}px`,
								left: `${i * 10}px`,
							}}
						>
							<Card />
						</div>
					))}
				</div>

				<div className="flex w-full items-center justify-center space-x-2">
					<Icon name="question-mark-circled" className="h-6 w-6" />
					<span className="text-lg font-normal">
						Clique na carta para girar
					</span>
				</div>
			</div>

			<div className="flex h-full w-[368px] flex-col justify-between">
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

				<div className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105">
					<div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#29DB89]  text-white">
						10
					</div>
					<span className="font-semibold">Sabia</span>
				</div>
				<div className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105">
					<div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#755FFF] text-white">
						04
					</div>
					<span className="font-semibold">Dúvida</span>
				</div>
				<div className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105">
					<div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#F75B62] text-white">
						02
					</div>
					<span className="font-semibold">Não Sabia</span>
				</div>
				<div className="flex w-full cursor-pointer items-center justify-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105">
					<Icon name="stack-outline-light" className="h-8 w-8" />
					<span className="font-semibold">Baralho Principal</span>
				</div>
			</div>
		</div>
	)
}

function Card() {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})
	return (
		<div className="relative h-[717px] w-[484px]">
			<animated.div
				style={{ transform }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-3xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-3 backface-hidden"
			>
				<div className="flex h-full w-full flex-col items-center justify-around rounded-xl border-4 border-blue-500 px-5">
					<div className="flex flex-col">
						<Icon
							name="circle-wavy-question-fill"
							className="h-44 w-44 text-blue-500"
						/>
						<h1 className="text-center text-5xl font-extrabold text-blue-500">
							Processo do Trabalho
						</h1>
					</div>

					<p className="overflow-auto text-center text-2xl font-medium">
						Quem pode substituir o empregador na audiência trabalhista?
					</p>

					<h3 className="text-xl font-semibold opacity-80">
						CLT (processo do Trabalho)
					</h3>
				</div>
			</animated.div>
			<animated.div
				style={{ transform, rotateY: '180deg' }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-3xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-3 backface-hidden"
			>
				<div className="flex h-full w-full flex-col items-center justify-start space-y-10 rounded-xl border-4 border-blue-500 p-5">
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
						<span className="text-center text-5xl font-extrabold text-blue-500">
							Resposta
						</span>

						<div className="text-justify text-2xl font-normal">
							<p>
								Contra os seguintes empregados garantidos com estabilidade: a)
								Dirigente sindical (artigo 8°, VIII, da CF/88 e artigo 543, §3°,
								da CLT); b) Empregados membros da CNPS (artigo 3° , §° 7, da Lei
								8.213 /91); c) Empregados eleitos membros de comissão de
								conciliação prévia (artigo 625-B, parágrafo primeiro, da CLT).
							</p>
						</div>
					</div>

					<div className="mt-3 flex w-full items-end justify-around">
						<button
							name="answer"
							value="sabia"
							onClick={e => {
								e.stopPropagation()
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
	return (
		<div id="first-col" className="flex h-full w-[368px] flex-col space-y-10">
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
						options={[]}
						selectedValues={[]}
						setSelectedValues={() => {}}
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
					<span className="text-gray-500">213</span>
				</div>
			</div>
		</div>
	)
}
