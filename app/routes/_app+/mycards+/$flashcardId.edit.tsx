import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { MyCardsEditor } from './__mycards-editor'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const materiaId = url.searchParams.get('materiaId')
	const userId = await requireUserId(request)
	const myFlashcardId = params.flashcardId
	invariantResponse(myFlashcardId, 'myFlashcardId is required')
	const myFlashcard = await prisma.userFlashcard.findFirst({
		select: {
			id: true,
			frente: true,
			verso: true,
			lei: {
				select: {
					id: true,
					name: true,
					materia: { select: { name: true, id: true } },
				},
			},
			ListsUsersMyFlashcards: {
				select: { list: { select: { id: true, name: true } } },
			},
		},
		where: { id: myFlashcardId, userId },
	})
	invariantResponse(myFlashcard, 'Not Found', { status: 404 })

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
		: await prisma.lei.findMany({
				select: { id: true, name: true },
				where: { status: true, materiaId: myFlashcard.lei.materia.id },
				orderBy: { name: 'asc' },
			})
	return json({ materias, leis, lists, myFlashcard })
}

export { action } from './__mycards-editor.server'
export default function FlashcardIdEdit() {
	const { leis, lists, materias, myFlashcard } = useLoaderData<typeof loader>()
	return (
		<MyCardsEditor
			materias={materias}
			leis={leis}
			lists={lists}
			flashcard={{
				...myFlashcard,
				lists: myFlashcard.ListsUsersMyFlashcards.map(({ list }) => ({
					id: list.id,
					name: list.name,
				})),
			}}
		/>
	)
}
