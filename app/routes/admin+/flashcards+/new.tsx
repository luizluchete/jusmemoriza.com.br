import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server.js'
import { FlashcardEditor } from './__flashcard-editor'

export { action } from './__flashcard-editor.server'
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)

	const materiaId = url.searchParams.get('materiaId') || undefined
	const leiId = url.searchParams.get('leiId') || undefined
	const tituloId = url.searchParams.get('tituloId') || undefined
	const capituloId = url.searchParams.get('capituloId') || undefined

	const materiasPromise = prisma.materia.findMany({
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
	const [materias, leis, titulos, capitulos, artigos] = await Promise.all([
		materiasPromise,
		leisPromise,
		titulosPromise,
		capitulosPromise,
		artigosPromise,
	])
	return json({ materias, leis, titulos, capitulos, artigos })
}
export default function New() {
	const { artigos, capitulos, leis, materias, titulos } =
		useLoaderData<typeof loader>()
	return (
		<FlashcardEditor
			materias={materias}
			leis={leis}
			titulos={titulos}
			capitulos={capitulos}
			artigos={artigos}
		/>
	)
}
