import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import {
	Form,
	redirect,
	useLoaderData,
	useNavigation,
	useSubmit,
} from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { createToastHeaders } from '#app/utils/toast.server'

const schemaAnswer = z.object({
	id: z.string(),
	answer: z.enum(['true', 'false']).optional(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userQuizId = params.userQuizId
	const quizId = params.quizId

	invariantResponse(userQuizId, 'userQuizId not provided', { status: 404 })
	invariantResponse(quizId, 'quizId not provided', { status: 404 })

	const userId = await requireUserId(request)
	const userQuiz = await prisma.userQuiz.findFirst({
		select: {
			quizzes: {
				select: {
					quiz: {
						select: {
							id: true,
							enunciado: true,
							ano: true,
							banca: { select: { name: true } },
							cargo: { select: { name: true } },
							artigo: {
								select: {
									capitulo: {
										select: {
											titulo: {
												select: {
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
					index: true,
				},
				orderBy: { id: 'asc' },
			},
		},
		where: { id: userQuizId, userId },
	})

	if (!userQuiz) {
		return redirect('/quizzes')
	}

	const quiz = userQuiz.quizzes.find(q => q.quiz.id === quizId)
	if (!quiz) {
		return redirect('/quizzes')
	}

	return json({
		quizzes: userQuiz.quizzes.map(q => q.quiz),
		quiz: { ...quiz.quiz, index: quiz.index },
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()

	const userId = await requireUserId(request)
	const quizId = params.quizId
	const userQuizId = params.userQuizId

	// Valida se o formulario de resposta do quiz é valido
	const values = Object.fromEntries(formData)
	const resultAnswer = schemaAnswer.safeParse(values)
	if (!resultAnswer.success) {
		console.error(resultAnswer.error)
		return redirect('/quizzes', {
			headers: await createToastHeaders({
				type: 'error',
				description: 'Formulario invalido ',
			}),
		})
	}

	const exists = await prisma.userQuizItems.findFirst({
		where: { quizId, quizUserId: userQuizId, quizUser: { userId } },
	})
	if (exists) {
		await prisma.userQuizItems.update({
			where: { id: exists.id },
			data: { answer: resultAnswer.data.answer ?? ' ' },
		})
	}

	const firtsQuiz = await prisma.userQuizItems.findFirst({
		where: { quizUserId: userQuizId, answer: null, quizUser: { userId } },
	})
	if (!firtsQuiz) {
		const result = await prisma.userQuiz.update({
			select: {
				leiId: true,
				quizzes: {
					select: { answer: true, quiz: { select: { verdadeiro: true } } },
				},
			},
			where: { id: userQuizId },
			data: { status: 'completed' },
		})

		/**
		 * Calculo do rating do quiz para atualizar na Lei
		 * Cada erro perde um 1 ponto
		 * Inicia com 3 pontos (maximo)
		 */
		let rating = 3
		const acertos = result.quizzes.filter(
			q => Boolean(q.answer === 'true') === q.quiz.verdadeiro,
		).length
		const erros = result.quizzes.length - acertos
		if (erros >= rating) {
			rating = 0
		} else {
			rating = rating - erros
		}

		// verica se o quiz gerado pertence a uma lei
		if (result.leiId) {
			const leiRating = await prisma.leiResultUser.findFirst({
				select: { ratingQuiz: true },
				where: { leiId: result.leiId, userId },
			})
			//Verifica se já existe o vinculo de rating do usuário com a lei
			if (leiRating) {
				//Se existir e a nova pontuação for maior que a anterior, atualiza
				if (leiRating.ratingQuiz < rating) {
					await prisma.leiResultUser.update({
						where: { leiId_userId: { leiId: result.leiId, userId } },
						data: { ratingQuiz: rating },
					})
				}
			} else {
				// Se não existir, cria um novo vinculo com a pontuação
				await prisma.leiResultUser.create({
					data: { ratingQuiz: rating, leiId: result.leiId, userId },
				})
			}
		}

		return redirect(`/quizzes/game/results/${userQuizId}`)
	}

	return redirect(`/quizzes/game/${userQuizId}/${firtsQuiz.quizId}`)
}

export default function () {
	const { quizzes, quiz } = useLoaderData<typeof loader>()

	const materiaColor = quiz.artigo.capitulo.titulo.lei.materia.color
	const materiaName = quiz.artigo.capitulo.titulo.lei.materia.name
	const index = quiz.index || 0

	const navigation = useNavigation()
	const submit = useSubmit()
	const isSubmitting = navigation.state === 'submitting'

	function onSubmitEmpty() {
		console.log('Fim do tempo')
		// envia sem a resposta
		submit({ id: quiz.id }, { method: 'post', replace: true })
	}

	return (
		<div className="flex w-full justify-center">
			<div className="-my-10 flex min-h-screen w-full max-w-xl flex-col justify-between gap-5 py-10">
				<div className="flex flex-wrap gap-3 md:flex-nowrap">
					<div className="flex w-full items-center rounded-xl border p-4">
						<Icon
							name="circle-wavy-fill"
							className="h-16 w-16 object-contain"
							style={{ color: materiaColor || 'gray' }}
						/>
						<div className="ml-4 flex flex-col">
							<span className="text-base font-medium">{materiaName}</span>
							<span className="text-base font-medium text-gray-400">
								{quizzes.length} Questões
							</span>
						</div>
					</div>
					<div className="flex w-full items-center rounded-xl border p-4">
						<Icon
							name="timer-quizzes"
							className="h-16 w-16 object-contain"
							style={{ color: materiaColor || 'gray' }}
						/>
						<div className="ml-4 flex flex-col">
							<span className="text-base font-medium">Tempo Restante</span>
							<Timer onEnd={onSubmitEmpty} key={quiz.id} />
						</div>
					</div>
				</div>

				<div className="text-justify text-2xl">
					<div dangerouslySetInnerHTML={{ __html: quiz.enunciado }} />
				</div>

				<div>
					<Form method="post" replace>
						<input type="hidden" hidden name="id" value={quiz.id} readOnly />
						<div className="flex flex-col gap-3 text-xl font-medium">
							<button
								disabled={isSubmitting}
								type="submit"
								name="answer"
								value="true"
								className="w-full rounded-xl border border-green-500 py-2 hover:bg-green-100"
							>
								{isSubmitting ? (
									<Icon name="update" className="animate-spin text-black" />
								) : (
									'VERDADEIRO'
								)}
							</button>
							<button
								disabled={isSubmitting}
								type="submit"
								name="answer"
								value="false"
								className="w-full rounded-xl border border-red-500 py-2 hover:bg-red-100"
							>
								{isSubmitting ? (
									<Icon name="update" className="animate-spin text-black" />
								) : (
									'FALSO'
								)}
							</button>
						</div>
					</Form>
				</div>

				<div>
					<div className="flex w-full flex-col text-center text-base font-medium">
						<span>{quiz.artigo.capitulo.titulo.lei.name}</span>
						<span>
							{`
						${quiz.banca ? `Banca: ${quiz.banca.name}  ` : ''}
						${quiz.cargo ? `Cargo: ${quiz.cargo.name}  ` : ''}
						${quiz.ano ? `Ano: ${quiz.ano}` : ''} 
						`}
						</span>
					</div>

					<div className="flex w-full flex-col gap-2">
						<div className="h-2 w-full rounded-full border">
							<div
								className="h-2 rounded-full bg-black transition-all duration-500"
								style={{ width: `${(index / quizzes.length) * 100}%` }}
							></div>
						</div>
						<span className="text-center text-base font-medium">
							Respondidas: {index} de {quizzes.length}
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}

function Timer({ time = 60, onEnd }: { time?: number; onEnd: () => void }) {
	const [timeLeft, setTimeleft] = useState(time)

	useEffect(() => {
		if (timeLeft === 0) {
			onEnd()
			return
		}

		const timer = setTimeout(() => {
			setTimeleft(prevTime => prevTime - 1)
		}, 1000)

		return () => clearTimeout(timer)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timeLeft])

	const minutes = Math.floor(timeLeft / 60)
	const seconds = timeLeft % 60
	return (
		<span className="text-3xl font-medium text-gray-400">{`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</span>
	)
}
