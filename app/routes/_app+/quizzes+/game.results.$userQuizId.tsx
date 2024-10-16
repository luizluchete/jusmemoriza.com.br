import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Dialog, DialogContent, DialogTrigger } from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn } from '#app/utils/misc.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { userQuizId } = params
	invariantResponse(userQuizId, 'userQuizId not provided', { status: 404 })
	const userId = await requireUserId(request)

	const userQuiz = await prisma.userQuiz.findFirst({
		select: {
			lei: { select: { materiaId: true } },
			quizzes: {
				select: {
					answer: true,
					quiz: {
						select: {
							id: true,
							enunciado: true,
							comentario: true,
							verdadeiro: true,
							fundamento: true,
						},
					},
				},
				orderBy: { index: 'asc' },
			},
		},
		where: { id: userQuizId, userId },
	})

	invariantResponse(userQuiz, 'UserQuiz not found', { status: 404 })
	return json({ answers: userQuiz.quizzes, materiaId: userQuiz.lei?.materiaId })
}
export default function LeiIdResults() {
	const { answers, materiaId } = useLoaderData<typeof loader>()

	const quantidadeCorretas = answers.filter(
		({ answer, quiz }) => Boolean(answer === 'true') === quiz.verdadeiro,
	).length

	const pontuacao = Math.trunc((quantidadeCorretas / answers.length) * 100)

	const erros = answers.length - quantidadeCorretas
	const estrelas = 3 - erros

	return (
		<div className="flex flex-col-reverse items-center justify-between gap-10 md:flex-row md:items-start">
			<div className="flex w-full flex-col">
				<h1 className="text-center text-4xl font-bold">Seu resultado</h1>

				<div className="flex w-full flex-col space-y-3">
					{answers.map(({ answer, quiz }, idx) => {
						const isCorrect = Boolean(answer === 'true') === quiz.verdadeiro
						return (
							<div key={quiz.id} className="flex">
								<div className="flex w-full rounded-xl border p-2">
									<div
										className={cn(
											'flex items-center justify-center rounded-md  p-4 text-xl text-white',
											isCorrect ? 'bg-green-500' : 'bg-red-500',
										)}
									>
										{idx + 1}
									</div>
									<div
										className="ml-4 text-lg font-semibold leading-tight"
										dangerouslySetInnerHTML={{ __html: quiz.enunciado }}
									/>
								</div>
								<ModalResult
									comentario={quiz.comentario}
									index={idx}
									enunciado={quiz.enunciado}
									fundamento={quiz.fundamento}
									acertou={isCorrect}
								/>
							</div>
						)
					})}
				</div>
			</div>
			<div className="flex w-full max-w-xs flex-col">
				<div className="flex h-min w-full">
					<CircularProgress percentage={pontuacao} />
					<div className="flex flex-col items-center justify-center ">
						<span className="text-lg font-semibold">Sua Pontuação</span>
						<span>
							{quantidadeCorretas} de {answers.length} questões
						</span>
						<div className="mt-1 flex w-full justify-evenly">
							<Icon
								name={estrelas > 0 ? 'star-color' : 'star-outline'}
								className="h-8 w-8 text-yellow-500"
							/>
							<Icon
								name={estrelas > 1 ? 'star-color' : 'star-outline'}
								className=" relative -top-1 h-8 w-8 text-yellow-500"
							/>
							<Icon
								name={estrelas > 2 ? 'star-color' : 'star-outline'}
								className="h-8 w-8 text-yellow-500"
							/>
						</div>
					</div>
				</div>

				<div className="flex h-full flex-col gap-5">
					<div className="flex items-center gap-3 rounded-xl border border-gray-300  p-2 font-semibold">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#4374F1] text-xl  text-white">
							{answers.length}
						</div>
						<span className="text-base">Respondidas</span>
					</div>
					<div className="flex items-center gap-3 rounded-xl border border-gray-300  p-2 font-semibold">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#29DB89] text-xl  text-white">
							{quantidadeCorretas}
						</div>
						<span className="text-base">Certas</span>
					</div>
					<div className="flex items-center gap-3 rounded-xl border border-gray-300  p-2 font-semibold">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F75B62] text-xl  text-white">
							{erros}
						</div>
						<span className="text-base">Erradas</span>
					</div>
					<Link to={materiaId ? `/quizzes?materiaId=${materiaId}` : '/quizzes'}>
						<div className="flex items-center justify-center gap-3 rounded-xl border  border-gray-300 p-2 font-semibold">
							<span className="text-center text-base">Voltar</span>
						</div>
					</Link>
				</div>
			</div>
		</div>
	)
}

function ModalResult({
	index,
	enunciado,
	comentario,
	fundamento,
	acertou,
}: {
	index: number
	enunciado: string
	comentario: string
	fundamento?: string | null
	acertou: boolean
}) {
	return (
		<Dialog>
			<DialogTrigger>
				<div className="ml-1 flex cursor-pointer items-center justify-center rounded-md bg-gray-300 p-4 transition-all hover:scale-105">
					<Icon name="magnifying-glass" className="h-5 w-5" />
				</div>
			</DialogTrigger>
			<DialogContent className="max-w-4xl">
				<div className="flex w-full items-center">
					<div
						className={cn(
							'flex items-center justify-center rounded-md bg-green-500 p-4 text-xl text-white',
							acertou ? 'bg-green-500' : 'bg-red-500',
						)}
					>
						{index + 1}
					</div>
					<div
						className="mx-4 text-justify text-lg font-semibold leading-tight"
						dangerouslySetInnerHTML={{ __html: enunciado }}
					/>
				</div>

				<div>
					<h2 className="font-semibold">Comentário:</h2>
					<div
						className="text-justify leading-tight"
						dangerouslySetInnerHTML={{ __html: comentario }}
					/>
				</div>
				{fundamento ? (
					<div>
						<h2 className="font-semibold">Fundamento:</h2>
						<div
							className="text-justify leading-tight"
							dangerouslySetInnerHTML={{ __html: fundamento }}
						/>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

const CircularProgress = ({ percentage }: { percentage: number }) => {
	const radius = 50 // Raio do círculo
	const circumference = 2 * Math.PI * radius // Circunferência do círculo

	// Calcula o stroke-dashoffset para preencher de acordo com o percentual
	const strokeDashoffset = circumference - (percentage / 100) * circumference

	return (
		<svg width={156} height={156} viewBox="0 0 120 120">
			<circle
				cx="60"
				cy="60"
				r={radius}
				fill="transparent"
				stroke="#e6e6e6" // Cor do fundo
				strokeWidth="5"
			/>
			<circle
				cx="60"
				cy="60"
				r={radius}
				fill="transparent"
				stroke="#29DB89" // Cor do progresso
				strokeWidth="5"
				strokeDasharray={circumference} // Comprimento total da circunferência
				strokeDashoffset={strokeDashoffset} // Controla o preenchimento com base no percentual
				strokeLinecap="round" // Opção de arredondar o fim do traço
				transform="rotate(-90 60 60)" // Rotaciona o círculo para começar no topo
			/>
			<text
				x="50%"
				y="50%"
				dominantBaseline="middle"
				textAnchor="middle"
				fontSize="24"
				fill="black"
			>
				{percentage}%
			</text>
		</svg>
	)
}
