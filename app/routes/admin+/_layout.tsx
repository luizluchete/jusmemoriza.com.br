import {
	type LoaderFunctionArgs,
	json,
	type LinksFunction,
} from '@remix-run/node'
import { NavLink, Outlet } from '@remix-run/react'
import stylesheetQuill from 'quill/dist/quill.snow.css?url'
import { GeneralErrorBoundary } from '#app/components/error-boundary.js'
import { requireUserWithRole } from '#app/utils/permissions.server'

export const links: LinksFunction = () => [
	{ rel: 'stylesheet', href: stylesheetQuill },
]

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	return json({})
}

export default function () {
	const navigation = [
		{ name: 'Configurações', href: '/admin' },
		{ name: 'Matérias', href: '/admin/materias' },
		{ name: 'Bancas', href: '/admin/bancas' },
		{ name: 'Cargos', href: '/admin/cargos' },
		{ name: 'Quizzes', href: '/admin/quizzes' },
		{ name: 'Flashcards', href: '/admin/flashcards' },
		{ name: 'Combos', href: '/admin/combos' },
		{ name: 'Importações', href: '/admin/import' },
		{ name: 'Errors reportados', href: '/admin/notify-errors' },
		{ name: 'Modo Usuário', href: '/home' },
	]
	return (
		<>
			<div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
				{/* Sidebar component, swap this element with another sidebar if you like */}
				<div className="flex min-h-0 flex-1 flex-col bg-indigo-700">
					<div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
						<div className="flex flex-shrink-0 items-center px-4"></div>
						<nav className="mt-5 flex-1 space-y-1 px-2">
							<ul>
								{navigation.map(item => (
									<li key={item.name}>
										<NavLink
											end
											to={item.href}
											className={({ isActive }) =>
												`${
													isActive ? 'bg-indigo-500 bg-opacity-75' : ''
												} group flex items-center rounded-md px-2 py-2 text-sm font-medium text-white hover:bg-indigo-500 hover:bg-opacity-75`
											}
										>
											{item.name}
										</NavLink>
									</li>
								))}
							</ul>
						</nav>
					</div>
				</div>
			</div>
			<div className="flex flex-1 flex-col md:pl-64">
				<main className="flex-1">
					<div className="py-6">
						<div className="mx-auto max-w-full px-4 sm:px-6 md:px-8">
							<Outlet />
						</div>
					</div>
				</main>
			</div>
		</>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
