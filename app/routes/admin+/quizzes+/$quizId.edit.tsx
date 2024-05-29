import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'

import { QuizEditor } from './__quiz-editor'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const quizId = params.quizId
	invariantResponse(quizId, 'Not found', { status: 404 })
	const quiz = await prisma.quiz.findFirst({
		where: { id: quizId },
		include: {
			cargo: true,
			banca: true,
			artigo: {
				include: {
					capitulo: {
						include: {
							titulo: { include: { lei: { include: { materia: true } } } },
						},
					},
				},
			},
		},
	})
	invariantResponse(quiz, 'Not found', { status: 404 })
	const url = new URL(request.url)

	const materiaId = url.searchParams.get('materiaId') || undefined
	const leiId = url.searchParams.get('leiId') || undefined
	const tituloId = url.searchParams.get('tituloId') || undefined
	const capituloId = url.searchParams.get('capituloId') || undefined

	const materiasPromise = prisma.materia.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	})
	const bancasPromise = prisma.banca.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	})
	const cargosPromise = prisma.cargo.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	})

	const leisPromise = prisma.lei.findMany({
		orderBy: { name: 'asc' },
		where: { materiaId },
		select: { id: true, name: true },
	})
	const titulosPromise = prisma.titulo.findMany({
		where: { lei: { id: leiId, materiaId } },
	})
	const capitulosPromise = prisma.capitulo.findMany({
		where: { tituloId, titulo: { leiId, lei: { materiaId } } },
	})
	const artigosPromise = prisma.artigo.findMany({
		where: {
			capituloId,
			capitulo: { tituloId, titulo: { leiId, lei: { materiaId } } },
		},
	})
	const [materias, leis, titulos, capitulos, artigos, cargos, bancas] =
		await Promise.all([
			materiasPromise,
			leisPromise,
			titulosPromise,
			capitulosPromise,
			artigosPromise,
			cargosPromise,
			bancasPromise,
		])
	return json({
		materias,
		leis,
		titulos,
		capitulos,
		artigos,
		cargos,
		bancas,
		quiz,
	})
}

export { action } from './__quiz-editor.server'

export default function NewQuiz() {
	const { artigos, capitulos, leis, materias, titulos, bancas, cargos, quiz } =
		useLoaderData<typeof loader>()

	return (
		<QuizEditor
			materias={materias}
			leis={leis}
			titulos={titulos}
			capitulos={capitulos}
			artigos={artigos}
			bancas={bancas}
			cargos={cargos}
			quiz={{
				...quiz,
				materiaId: quiz.artigo.capitulo.titulo.lei.materia.id,
				leiId: quiz.artigo.capitulo.titulo.lei.id,
				tituloId: quiz.artigo.capitulo.titulo.id,
				capituloId: quiz.artigo.capitulo.id,
			}}
		/>
	)
}
