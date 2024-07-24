import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { getUserImgSrc } from '#app/utils/misc.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const users = await prisma.user.findMany({
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true,
			email: true,
			image: { select: { id: true } },
		},
	})
	return json({ users })
}

export default function Index() {
	const { users } = useLoaderData<typeof loader>()
	return (
		<div className="px-4 sm:px-6 lg:px-8">
			<div className="sm:flex sm:items-center">
				<div className="sm:flex-auto">
					<h1 className="text-base font-semibold leading-6 text-gray-900">
						Usuários
					</h1>
				</div>
			</div>
			<div className="mt-8 flow-root">
				<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
						<table className="min-w-full divide-y divide-gray-300">
							<thead>
								<tr>
									<th
										scope="col"
										className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
									>
										Nome
									</th>

									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Status
									</th>
									<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
										<span className="sr-only">Ver</span>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{users.map(user => (
									<tr key={user.id}>
										<td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm sm:pl-0">
											<div className="flex items-center">
												<div className="h-11 w-11 flex-shrink-0">
													<img
														alt=""
														src={getUserImgSrc(user.image?.id)}
														className="h-11 w-11 rounded-full object-cover"
													/>
												</div>
												<div className="ml-4">
													<div className="font-medium text-gray-900">
														{user.name}
													</div>
													<div className="mt-1 text-gray-500">{user.email}</div>
												</div>
											</div>
										</td>

										<td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
											<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
												Ativo
											</span>
										</td>
										<td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
											<Link
												to={user.id}
												className="text-indigo-600 hover:text-indigo-900"
											>
												Visualizar<span className="sr-only">, {user.name}</span>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	)
}
