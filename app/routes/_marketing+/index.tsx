import {
	Popover,
	PopoverBackdrop,
	PopoverButton,
	PopoverPanel,
} from '@headlessui/react'
import { type MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'
import logoLight from '#app/components/ui/img/logo_jusmemoriza_light.png'
import { cn } from '#app/utils/misc.js'

export const meta: MetaFunction = () => [
	{ title: 'JusMemoriza | Prepare-se para Concursos Públicos !' },
]

export default function Index() {
	return (
		<>
			<Header />
			<main>
				<Hero />
			</main>
			<Footer />
		</>
	)
}

function MobileNavLink({
	href,
	children,
}: {
	href: string
	children: React.ReactNode
}) {
	return (
		<PopoverButton as={Link} to={href} className="block w-full p-2">
			{children}
		</PopoverButton>
	)
}

function MobileNavIcon({ open }: { open: boolean }) {
	return (
		<svg
			aria-hidden="true"
			className="h-3.5 w-3.5 overflow-visible stroke-slate-700"
			fill="none"
			strokeWidth={2}
			strokeLinecap="round"
		>
			<path
				d="M0 1H14M0 7H14M0 13H14"
				className={cn('origin-center transition', open && 'scale-90 opacity-0')}
			/>
			<path
				d="M2 2L12 12M12 2L2 12"
				className={cn(
					'origin-center transition',
					!open && 'scale-90 opacity-0',
				)}
			/>
		</svg>
	)
}

function MobileNavigation() {
	return (
		<Popover>
			<PopoverButton
				className="ui-not-focus-visible:outline-none relative z-10 flex h-8 w-8 items-center justify-center"
				aria-label="Toggle Navigation"
			>
				{({ open }) => <MobileNavIcon open={open} />}
			</PopoverButton>
			<PopoverBackdrop
				transition
				className="fixed inset-0 bg-slate-300/50 duration-150 data-[closed]:opacity-0 data-[enter]:ease-out data-[leave]:ease-in"
			/>
			<PopoverPanel
				transition
				className="absolute inset-x-0 top-full mt-4 flex origin-top flex-col rounded-2xl bg-white p-4 text-lg tracking-tight text-slate-900 shadow-xl ring-1 ring-slate-900/5 data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-150 data-[leave]:duration-100 data-[enter]:ease-out data-[leave]:ease-in"
			>
				<MobileNavLink href="#features">Funcionalidades</MobileNavLink>
				<MobileNavLink href="#testimonials">Depoimentos</MobileNavLink>
				<MobileNavLink href="#pricing">Preços</MobileNavLink>
				<hr className="m-2 border-slate-300/40" />
				<MobileNavLink href="/login">Entrar</MobileNavLink>
			</PopoverPanel>
		</Popover>
	)
}

function Header() {
	return (
		<header className="py-10">
			<div className="container">
				<nav className="relative z-50 flex justify-between">
					<div className="flex items-center md:gap-x-12">
						<Link to="#" aria-label="Home">
							<img src={logoLight} alt="logo Jus" className="h-12 w-auto" />
						</Link>
						<div className="hidden md:flex md:gap-x-6">
							<Link
								to="#features"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Funcionalidades
							</Link>
							<Link
								to="#testimonials"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Depoimentos
							</Link>
							<Link
								to="#pricing"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Preços
							</Link>
						</div>
					</div>
					<div className="flex items-center gap-x-5 md:gap-x-8">
						<div className="hidden md:block">
							<Link
								to="login"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Entrar
							</Link>
						</div>
						<Link
							to="signup"
							className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>
							<span>Inicie Sua Preparação</span>
						</Link>
						<div className="-mr-1 md:hidden">
							<MobileNavigation />
						</div>
					</div>
				</nav>
			</div>
		</header>
	)
}

function Hero() {
	return (
		<div className="relative isolate pt-14">
			<div
				aria-hidden="true"
				className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
			>
				<div
					style={{
						clipPath:
							'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
					}}
					className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
				/>
			</div>
			<div className="py-24 sm:py-32 lg:pb-40">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center">
						<h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
							Prepare-se para Concursos Públicos!
						</h1>
						<p className="mt-6 text-lg leading-8 text-gray-600">
							Domine as principais leis cobradas nos concursos públicos, nossa
							plataforma de quizzes e flashcards baseada na Lei Seca. A maneira
							mais prática e eficaz de fixar o conteúdo e garantir sua
							aprovação.
						</p>
						<div className="mt-10 flex items-center justify-center gap-x-6">
							<Link
								to={'/signup'}
								className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							>
								Inicie agora
							</Link>
						</div>
					</div>
					<div className="mt-16 flow-root sm:mt-24">
						<div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
							<img
								alt="App screenshot"
								src="https://tailwindui.com/img/component-images/project-app-screenshot.png"
								width={2432}
								height={1442}
								className="rounded-md shadow-2xl ring-1 ring-gray-900/10"
							/>
						</div>
					</div>
				</div>
			</div>
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
			>
				<div
					style={{
						clipPath:
							'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
					}}
					className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
				/>
			</div>
		</div>
	)
}

function Footer() {
	return (
		<footer className="bg-slate-50">
			<div className="container">
				<div className="py-16">
					<img alt="logo" src={logoLight} className="mx-auto h-12 w-auto" />
					<nav className="mt-10 text-sm" aria-label="quick links">
						<div className="-my-1 flex justify-center gap-x-6">
							<Link
								to="#features"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Funcionalidades
							</Link>
							<Link
								to="#testimonials"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Depoimentos
							</Link>
							<Link
								to="#pricing"
								className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							>
								Preços
							</Link>
						</div>
					</nav>
				</div>
				<div className="flex flex-col items-center border-t border-slate-400/10 py-10 sm:flex-row-reverse sm:justify-between">
					<p className="mt-6 text-sm text-slate-500 sm:mt-0">
						Copyright &copy; {new Date().getFullYear()} JusMemoriza. Todos os
						direitos reservados.
					</p>
				</div>
			</div>
		</footer>
	)
}
