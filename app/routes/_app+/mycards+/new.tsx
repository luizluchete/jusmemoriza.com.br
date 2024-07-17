import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { MyCardsEditor } from './__mycards-editor'
export { action } from './__mycards-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const materiaId = url.searchParams.get('materiaId')
	const userId = await requireUserId(request)
	const materias = await prisma.materia.findMany({
		select: { id: true, name: true },
		where: { status: true },
		orderBy: { name: 'asc' },
	})
	const lists = await prisma.listsUser.findMany({
		select: { id: true, name: true },
		where: { userId },
	})
	const leis = materiaId
		? await prisma.lei.findMany({
				select: { id: true, name: true },
				where: { status: true, materiaId },
				orderBy: { name: 'asc' },
			})
		: []
	return json({ materias, leis, lists })
}

export default function New() {
	const { materias, leis, lists } = useLoaderData<typeof loader>()
	return <MyCardsEditor materias={materias} leis={leis} lists={lists} />
}
