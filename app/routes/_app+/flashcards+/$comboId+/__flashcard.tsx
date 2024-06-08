import { useSpring, animated } from '@react-spring/web'
import { Form, useSearchParams } from '@remix-run/react'
import { useState } from 'react'
import { Icon } from '#app/components/ui/icon'
import logoBranco from '#app/components/ui/img/logo_jusmemoriza_branco.png'
import { cn } from '#app/utils/misc'

type FlashcardProps = {
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
	next: () => void
}

export function Flashcard({
	flashcard: { frente, verso, materia, lei, id },
	next,
}: FlashcardProps) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})

	const [searchParams] = useSearchParams()
	function colorByTipo() {
		const tipo = searchParams.get('tipo')
		if (tipo === 'sabia') {
			return 'bg-green-900'
		}
		if (tipo === 'duvida') {
			return 'bg-purple-900'
		}
		if (tipo === 'nao_sabia') {
			return 'bg-red-900'
		}
		return ''
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
					colorByTipo(),
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

				<Form method="post" onSubmit={next}>
					<input type="hidden" name="id" readOnly value={id} />
					<input type="hidden" name="intent" value="answer" />
					<div className="w-ful mt-3 flex justify-around">
						<button name="answer" value="sabia">
							<div className="flex flex-col items-center hover:text-[#007012] ">
								<Icon
									name="emoji-acertei"
									className="h-12 w-12  rounded-full hover:bg-[#DAEBD1]"
								/>
								<span>Acertei</span>
							</div>
						</button>

						<button name="answer" value="duvida">
							<div className="flex flex-col items-center hover:text-primary">
								<div className="h-12 w-12 rounded-full hover:bg-purple-500/10">
									<Icon name="emoji-duvida" className="h-12 w-12" />
								</div>
								<span>Dúvida</span>
							</div>
						</button>
						<button name="answer" value="nao_sabia">
							<div className="flex flex-col items-center hover:text-red-500 ">
								<Icon
									name="emoji-errei"
									className="h-12 w-12 rounded-full hover:bg-[#F8D8DE]"
								/>
								<span>Não Sabia</span>
							</div>
						</button>
					</div>
				</Form>
			</animated.div>
		</div>
	)
}
