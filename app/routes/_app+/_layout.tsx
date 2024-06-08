import { NavLink, Outlet } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon'
import logoBranco from '#app/components/ui/img/logo_jusmemoriza_branco.png'

const navigation = [
	{ name: 'Início', href: '/home', icon: 'home' },
	{ name: 'Lei Seca', href: '/lei-seca', icon: 'lei' },
	{ name: 'Flashcards', href: '/flashcards', icon: 'game-card' },
	{ name: 'Minhas Listas', href: '/lists', icon: 'books' },
	{ name: 'Estatísticas', href: '/statistics', icon: 'chart-curve' },
]

export default function LayoutApp() {
	return (
		<div>
			<div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-52 lg:flex-col">
				{/* Sidebar component, swap this element with another sidebar if you like */}
				<div className="flex min-h-0 flex-1 flex-col rounded-r-xl bg-primary">
					<div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
						<div className="flex flex-shrink-0 items-center px-4">
							<img
								src={logoBranco}
								height={100}
								width={300}
								alt="Logo Jusmemoriza"
							/>
						</div>
						<nav className="mt-5 flex-1 space-y-1 pl-3">
							<ul>
								{navigation.map(item => (
									<li key={item.name}>
										<NavItem
											href={item.href}
											icon={item.icon}
											name={item.name}
										/>
									</li>
								))}

								<br />
								<div className="ml-8 w-32 border-t bg-background"></div>
								<br />
								<NavItem href="/profile" icon="account-box" name="Perfil" />

								<form method="post" action="/logout">
									<button
										type="submit"
										className="group flex items-center rounded-md px-8 py-5 text-sm font-medium text-white hover:opacity-50"
									>
										<Icon
											name="exit"
											className="mr-4 h-6 w-6 flex-shrink-0 text-[#959BA5]"
										/>
										Sair
									</button>
								</form>
							</ul>
						</nav>
					</div>
				</div>
			</div>
			<div className="flex flex-1 flex-col lg:pl-52">
				<main className="flex-1">
					<div className="py-6">
						<div className="container">
							<button
								type="button"
								className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
								// onClick={() => setSidebarOpen(true)}
							>
								<span className="sr-only">Open sidebar</span>
								<Icon name="view-list" className="h-6 w-6" aria-hidden="true" />
							</button>
							<Outlet />
						</div>
					</div>
				</main>
			</div>
		</div>
	)
}

export const NavItem = ({
	href,
	name,
	...props
}: {
	name: string
	href: string
	icon: any
}) => (
	<NavLink
		className={'relative w-full rounded-l-full'}
		to={href}
		prefetch="intent"
	>
		{({ isActive }) => (
			<div
				key={name}
				className={`
  ${
		isActive
			? 'before:bg-puble-500 bg-background text-primary before:absolute before:bottom-full before:right-0 before:h-8 before:w-8 before:rounded-br-xl before:shadow-[0_17px_0_rgb(255,255,255)] after:absolute after:right-0 after:top-full after:h-8 after:w-8 after:rounded-tr-xl after:bg-primary after:shadow-[0_-17px_0_rgb(255,255,255)]'
			: 'text-[#959BA5] hover:opacity-50'
	}
  group flex items-center rounded-md px-8 py-5 text-sm font-medium`}
			>
				<Icon
					name={props.icon}
					className={`mr-4 h-6 w-6 flex-shrink-0 ${
						isActive ? 'text-primary' : 'text-[#959BA5]'
					}`}
					aria-hidden="true"
				/>
				<span
					className={`${
						isActive ? 'text-primary' : 'text-white'
					} text-sm font-medium`}
				>
					{name}
				</span>
			</div>
		)}
	</NavLink>
)
