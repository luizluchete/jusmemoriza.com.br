import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const lists = await prisma.listsUser.findMany({
		select: { id: true, name: true, _count: { select: { flashcards: true } } },
		where: { userId },
	})

	return json({
		lists: lists.map(({ _count, id, name }) => ({
			id,
			name,
			countFlashcards: _count.flashcards,
		})),
	})
}

export default function Index() {
	const { lists } = useLoaderData<typeof loader>()
	return (
		<div>
			<div>
				<div className="mb-5 flex w-full flex-col items-center justify-center space-y-1">
					<h2 className="text-center text-xl font-semibold text-primary">
						Escolha uma de suas listas personalizadas para revisar
					</h2>
					<h3 className="text-sm font-normal text-gray-500">
						Selecione abaixo sua lista para estudar
					</h3>
				</div>
				<hr />
			</div>

			{lists.length === 0 && (
				<div className="flex items-center justify-center p-20">
					Nenhuma lista cadastrada
				</div>
			)}

			<ul className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
				{lists.map(list => (
					<Link to={`${list.id}/flashcards`} key={list.id}>
						<div className="h-20 w-full cursor-pointer rounded-lg bg-primary hover:brightness-90">
							<div className="flex h-full flex-col justify-center px-5">
								<span className="truncate text-lg font-extrabold text-white">
									{list.name}
								</span>
								<span className="text-sm font-semibold text-white">
									Flashcards: {list.countFlashcards}
								</span>
							</div>
						</div>
					</Link>
				))}
			</ul>
		</div>
	)
}
