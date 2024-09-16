import { invariantResponse } from '@epic-web/invariant'
import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { createToastHeaders } from '#app/utils/toast.server'
export async function loader({ request, params }: LoaderFunctionArgs) {
	const { leiId } = params
	const lei = await prisma.lei.findFirst({
		select: { id: true, name: true },
		where: { id: leiId, status: true },
	})
	invariantResponse(lei, 'Lei not found', { status: 404 })

	const userId = await requireUserId(request)

	// busca 8 quizzes aleatoriamente da lei selecionada
	const quizzes = await prisma.$queryRawUnsafe<{ id: string }[]>(
		`SELECT quizzes.id 
	   	   FROM quizzes, artigos, capitulos, titulos, leis, materias 
		  WHERE quizzes."artigoId" = artigos.id
		  	AND artigos."capituloId" = capitulos.id
			AND capitulos."tituloId" = titulos.id
			AND titulos."leiId" = leis.id
			AND leis."materiaId" = materias.id
			AND quizzes.status = true 
		    AND artigos.status = true 
			AND capitulos.status = true 
			AND titulos.status = true 
			AND materias.status = true
			AND leis.status = true
			AND leis.id = $1 
		ORDER BY RANDOM()
		LIMIT 8`,
		leiId,
	)

	if (quizzes.length === 0) {
		return redirect('/quizzes', {
			headers: await createToastHeaders({
				type: 'error',
				description: `Nenhum quiz encontrado para ${lei.name}`,
			}),
		})
	}

	// remove quizzes que o usuário já começou e não terminou
	await prisma.$transaction([
		prisma.userQuizItems.deleteMany({
			where: { quizUser: { userId, status: 'started' } },
		}),
		prisma.userQuiz.deleteMany({ where: { userId, status: 'started' } }),
	])

	const userQuiz = await prisma.userQuiz.create({
		data: {
			userId,
			quizzes: {
				createMany: { data: quizzes.map(quiz => ({ quizId: quiz.id })) },
			},
		},
	})
	const firstQuiz = quizzes.sort(({ id }) => (id === userQuiz.id ? -1 : 1))[0]
	return redirect(`/quizzes/game/${userQuiz.id}/${firstQuiz.id}`)
}
