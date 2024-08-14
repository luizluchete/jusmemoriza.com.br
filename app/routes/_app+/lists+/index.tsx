import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const lists = await prisma.listsUser.findMany({
		select: {
			id: true,
			name: true,
			color: true,
			icon: true,
			_count: {
				select: {
					flashcards: {
						where: {
							NOT: { OR: [{ flashcardId: '' }, { flashcardId: null }] },
						},
					},
				},
			},
		},
		where: { userId },
	})

	return json({
		lists: lists.map(({ _count, id, name, color, icon }) => ({
			id,
			name,
			color,
			icon,
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

			<ul className="mt-3 grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
				{lists.map(list => (
					<Link to={`${list.id}/flashcards`} key={list.id}>
						<div className="flex h-28 w-full max-w-96 cursor-pointer items-center space-x-2  rounded-lg border border-gray-300 px-4 hover:shadow-md">
							<div
								className="flex h-16 w-16 items-center justify-center rounded-full"
								style={{ backgroundColor: list.color || undefined }}
							>
								{list.icon ? (
									<Icon
										name={list.icon as keyof typeof Icon}
										className="h-10 w-10 text-white"
									/>
								) : null}
							</div>
							<div className="flex h-full flex-1 flex-col justify-center">
								<h3 className="text-ellipsis text-xl font-bold text-gray-700">
									{list.name}
								</h3>
								<div className="flex justify-between">
									<span className="text-gray-500">
										{list.countFlashcards} flashcards
									</span>
								</div>
							</div>
						</div>
					</Link>
				))}
			</ul>
		</div>
	)
}
