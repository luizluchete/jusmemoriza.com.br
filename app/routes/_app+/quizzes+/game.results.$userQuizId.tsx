import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { userQuizId } = params
	invariantResponse(userQuizId, 'userQuizId not provided', { status: 404 })
	const userId = await requireUserId(request)

	const userQuiz = await prisma.userQuiz.findFirst({
		select: {
			quizzes: {
				select: {
					answer: true,
					quiz: {
						select: {
							id: true,
							enunciado: true,
							comentario: true,
							verdadeiro: true,
						},
					},
				},
				orderBy: { id: 'asc' },
			},
		},
		where: { id: userQuizId, userId },
	})

	invariantResponse(userQuiz, 'UserQuiz not found', { status: 404 })
	return json({ answers: userQuiz.quizzes })
}
export default function LeiIdResults() {
	const { answers } = useLoaderData<typeof loader>()

	return (
		<div>
			<h1>Seu Resultado</h1>
			<ul>
				{answers.map((answer, index) => {
					const isCorrect = !answer.answer?.trim()
						? false
						: (answer.answer === 'true') === answer.quiz.verdadeiro

					return (
						<li key={answer.quiz.id}>
							<div
								className="text-justify"
								dangerouslySetInnerHTML={{
									__html: `${index + 1}. ${answer.quiz.enunciado} `,
								}}
							/>

							<p>{answer.quiz.comentario}</p>
							<p>Resposta: {answer.quiz.verdadeiro ? 'Verdadeiro' : 'Falso'}</p>
							<p>
								Resposta do usuário:{' '}
								{answer.answer?.trim()
									? answer.answer === 'true'
										? 'Verdadeiro'
										: 'Falso'
									: ''}
							</p>
							<p>{isCorrect ? 'Você acertou !' : 'Você Errou !'}</p>
						</li>
					)
				})}
			</ul>
		</div>
	)
}
