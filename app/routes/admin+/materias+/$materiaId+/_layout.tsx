import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { NavLink, Outlet, json, useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariantResponse(params.materiaId, 'Not found', { status: 404 })
	const materia = await prisma.materia.findFirst({
		select: { name: true },
		where: { id: params.materiaId },
	})
	invariantResponse(materia, 'Not found', { status: 404 })
	return json({ materia })
}
export default function () {
	const secondaryNavigation = [
		{ name: 'Geral', href: '' },
		{ name: 'Leis', href: 'leis' },
	]
	const { materia } = useLoaderData<typeof loader>()
	return (
		<main>
			<h1 className="text-4xl">
				Matéria: <span className="font-bold">{materia.name.toUpperCase()}</span>
			</h1>
			<hr className="my-2 h-0.5 bg-gray-200" />
			<header className="border-b border-white/5">
				{/* Secondary navigation */}
				<nav className="flex overflow-x-auto">
					<ul className="flex min-w-full flex-none gap-x-6 text-sm font-semibold leading-6 text-gray-400">
						{secondaryNavigation.map((item, index) => (
							<li key={item.name} className="text-xl">
								<NavLink
									to={item.href}
									end={index === 0}
									className={({ isActive }) =>
										isActive ? 'text-indigo-400' : ''
									}
								>
									{item.name}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
			</header>

			<hr className="my-2 h-0.5 bg-gray-200" />
			<Outlet />
		</main>
	)
}
