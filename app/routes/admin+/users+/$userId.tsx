import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const userId = params.userId
	invariantResponse(userId, 'userId is required')
	const user = await prisma.user.findUnique({
		select: {
			id: true,
			name: true,
			email: true,
			roles: { select: { role: { select: { name: true } } } },
			image: { select: { id: true } },
		},
		where: { id: userId },
	})
	if (!user) invariantResponse(user, 'User not found', { status: 404 })

	const purchases = await prisma.purchasesUser.findMany({
		select: {
			id: true,
			name: true,
			plan: true,
			status: true,
			purchaseAt: true,
			expiresAt: true,
			refundedAt: true,
		},
		where: { email: user.email },
	})
	return json({ user, purchases })
}
export default function Example() {
	const { purchases, user } = useLoaderData<typeof loader>()
	return (
		<div>
			<div className="px-4 sm:px-0">
				<h3 className="text-base font-semibold leading-7 text-gray-900">
					Informações do usuário
				</h3>
				<p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
					Dados pessoais e informações da plataforma.
				</p>
			</div>
			<div className="mt-6 border-t border-gray-100">
				<dl className="divide-y divide-gray-100">
					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">
							Nome
						</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							{user.name}
						</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">
							Email
						</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							{user.email}
						</dd>
					</div>
					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">
							Permissões
						</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							<ul>
								{user.roles.map(({ role }) => (
									<li key={role.name}>{role.name}</li>
								))}
							</ul>
						</dd>
					</div>
					{purchases.length > 0 ? (
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								Compras / Acessos
							</dt>
							<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
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
												Plano
											</th>
											<th
												scope="col"
												className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
											>
												Data Compra
											</th>
											<th
												scope="col"
												className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
											>
												Data Reembolso
											</th>
											<th
												scope="col"
												className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
											>
												Status Hotmart
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{purchases.map(purchase => (
											<tr key={purchase.id}>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
													{purchase.name}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{purchase.plan}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{new Date(purchase.purchaseAt).toLocaleDateString()}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{purchase.refundedAt
														? new Date(purchase.refundedAt).toLocaleDateString()
														: null}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{purchase.status}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</dd>
						</div>
					) : null}
				</dl>
			</div>
		</div>
	)
}
