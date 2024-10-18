import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const notes = await prisma.noteUserQuiz.findMany({
		select: { note: true, quizId: true },
		where: { userId },
	})
	return json({ notes })
}
export default function Index() {
	const { notes } = useLoaderData<typeof loader>()
	return (
		<div className="flex w-full flex-col">
			<h1 className="mb-5 text-center text-h5">Minhas anotações</h1>

			<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
				{notes.map(note => (
					<li
						key={note.quizId}
						className="min-h-52 overflow-y-auto text-wrap rounded-lg border border-gray-200 p-2 text-justify shadow-md"
					>
						{note.note}
					</li>
				))}
			</ul>
		</div>
	)
}
