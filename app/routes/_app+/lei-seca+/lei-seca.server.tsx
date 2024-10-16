import { getGlobalParams } from '#app/utils/config.server'
import { prisma } from '#app/utils/db.server.js'
import { sendEmail } from '#app/utils/email.server'

export async function notifyErrorQuiz(
	quizId: string,
	userId: string,
	message: string,
) {
	const configs = await getGlobalParams()
	if (configs && configs.notifyEmail) {
		const notifyEmail = configs.notifyEmail
		const user = await prisma.user.findFirst({
			select: { name: true, email: true },
			where: { id: userId },
		})
		if (!user) return false
		const quiz = await prisma.quiz.findFirst({ where: { id: quizId } })
		await prisma.notifyError.create({
			data: { userMessage: message, quizId, userId },
		})
		const response = await sendEmail({
			subject: 'Erro em quiz reportado por usuário',
			to: notifyEmail,
			react: (
				<div>
					<h1>Erro em quiz reportado por usuário</h1>
					<p>
						Usuário: {user.name} ({user.email})
					</p>
					<p>Mensagem: {message}</p>
					<p>Enunciado: {quiz?.enunciado}</p>
					<p>Comentario: {quiz?.comentario}</p>
					<p>Fundamento: {quiz?.fundamento}</p>
					<p>Alternativa: {quiz?.verdadeiro ? 'Verdadeiro' : 'Falso'}</p>

					<p>foi incluido no sistema para verificação !</p>
				</div>
			),
		})

		if (response.status === 'success') {
			return true
		}
	}
	return false
}

export async function buscaMateriasParaFiltro(
	userId: string,
): Promise<{ id: string; name: string }[]> {
	const materias = await prisma.materia.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			Lei: {
				some: {
					titulos: {
						some: {
							capitulos: {
								some: {
									artigos: { some: { quizzes: { some: { status: true } } } },
								},
							},
						},
					},
				},
			},
		},
	})
	return materias
}
