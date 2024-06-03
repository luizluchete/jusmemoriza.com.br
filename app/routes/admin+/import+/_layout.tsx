import { NavLink, Outlet } from '@remix-run/react'

export default function ImportacoesPage() {
	return (
		<div>
			<header className="mb-10 border-b border-white/5">
				{/* Secondary navigation */}
				<nav className="flex overflow-x-auto">
					<ul className="flex min-w-full flex-none gap-x-6 text-sm font-semibold leading-6 text-gray-400">
						<li className="text-xl">
							<NavLink
								to="/admin/import"
								end={true}
								className={({ isActive }) =>
									isActive ? 'text-indigo-400' : ''
								}
							>
								Quizzes
							</NavLink>
						</li>
						<li className="text-xl">
							<NavLink
								to="flashcards"
								className={({ isActive }) =>
									isActive ? 'text-indigo-400' : ''
								}
							>
								Flashcards
							</NavLink>
						</li>
					</ul>
				</nav>
			</header>

			<Outlet />
		</div>
	)
}
