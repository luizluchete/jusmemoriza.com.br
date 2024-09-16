import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { Form, redirect, useLoaderData, useNavigation } from '@remix-run/react'
import { z } from 'zod'
import { Button } from '#app/components/ui/button'
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
				select: { quiz: { select: { id: true, enunciado: true } } },
				orderBy: { id: 'asc' },
			},
		},
		where: { id: userQuizId, userId },
	})

	if (!userQuiz) {
		return redirect('/quizzes')
	}

	const quiz = userQuiz.quizzes.find(q => q.quiz.id === quizId)?.quiz
	if (!quiz) {
		return redirect('/quizzes')
	}
	return json({
		quizzes: userQuiz.quizzes.map(q => q.quiz),
		quiz,
		index: userQuiz.quizzes.findIndex(q => q.quiz.id === quizId),
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
		await prisma.userQuiz.update({
			where: { id: userQuizId },
			data: { status: 'completed' },
		})
		return redirect(`/quizzes/game/results/${userQuizId}`)
	}

	return redirect(`/quizzes/game/${userQuizId}/${firtsQuiz.quizId}`)
}

export default function LeiIdGameQuizId() {
	const { quiz, quizzes, index } = useLoaderData<typeof loader>()

	const navigation = useNavigation()
	const isSubmitting = navigation.state === 'submitting'
	return (
		<div>
			<div></div>

			<div>
				<div dangerouslySetInnerHTML={{ __html: quiz?.enunciado }} />
			</div>

			<Form method="post" replace>
				<input type="hidden" hidden name="id" value={quiz.id} readOnly />

				<fieldset>
					<div
						className="mt-6 space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0"
						key={quiz.id}
					>
						<div className="flex items-center">
							<input
								id={'true-option'}
								name="answer"
								value="true"
								type="radio"
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
							/>
							<label
								htmlFor="true-option"
								className="ml-3 block text-sm font-medium leading-6 text-gray-900"
							>
								Verdadeiro
							</label>
						</div>
						<div className="flex items-center">
							<input
								id={'false-option'}
								name="answer"
								value="false"
								type="radio"
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
							/>
							<label
								htmlFor="false-option"
								className="ml-3 block text-sm font-medium leading-6 text-gray-900"
							>
								Falso
							</label>
						</div>
					</div>
				</fieldset>

				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? (
						<Icon name="update" className="animate-spin" />
					) : index + 1 === quizzes.length ? (
						'Finalizar'
					) : (
						'Proximo'
					)}
				</Button>
			</Form>

			<div>
				{index + 1} / {quizzes.length}
			</div>
		</div>
	)
}
