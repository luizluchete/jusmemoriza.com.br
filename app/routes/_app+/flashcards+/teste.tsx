import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { cn, getUserImgSrc } from '#app/utils/misc.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		select: {
			name: true,
			image: { select: { id: true } },
		},
		where: { id: userId },
	})
	if (!user) invariantResponse(user, 'Not found', { status: 404 })
	return json({ user })
}

export default function Teste() {
	const { user } = useLoaderData<typeof loader>()
	return (
		<div className="container flex space-x-16">
			<div>
				<div className="space-y-5">
					<div className="flex w-[380px] cursor-pointer items-center justify-center rounded-xl border border-gray-400 py-3 transition-all hover:scale-105">
						<Icon name="tabler-filter" className="h-6 w-6" />
						<span className="font-bold">Filtros</span>
					</div>
					<div className="relative">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className={cn('absolute')}
								style={{
									left: `${i * 10}px`,
									opacity: i === 4 ? 1 : i * 0.1 + 0.2,
								}}
							>
								<Card />
							</div>
						))}
					</div>
				</div>
			</div>
			<div className="w-80 space-y-5">
				<div className="flex items-center space-x-3 rounded-xl border bg-gray-100 p-2">
					<img
						src={getUserImgSrc(user.image?.id)}
						alt="avatar"
						className="h-9 w-9 rounded-xl object-cover"
					/>
					<span className="font-semibold">
						Olá, {user?.name.split(' ')[0]}!
					</span>
				</div>

				<div className="flex justify-center">
					<div className="h-40 w-full max-w-64">
						{/* <div className="relative h-0 w-64  rounded-t-full bg-gradient-to-r from-red-400 from-10% via-sky-500 via-30% to-green-400 to-90% pb-[50%]">
							<div className="absolute left-0 top-full h-full w-[inherit] origin-top bg-red-500"></div>
						</div> */}
					</div>
				</div>

				<div className="flex w-full cursor-pointer items-center space-x-3 rounded-xl border bg-gray-100 p-2 transition-all hover:scale-105">
					<div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-400 font-bold text-white">
						10
					</div>
					<span className="font-semibold">Sabia</span>
				</div>
				<div className="flex w-full cursor-pointer items-center space-x-3 rounded-xl border bg-gray-100 p-2 transition-all hover:scale-105">
					<div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-400 font-bold text-white">
						04
					</div>
					<span className="font-semibold">Dúvida</span>
				</div>
				<div className="flex w-full cursor-pointer items-center space-x-3 rounded-xl border bg-gray-100 p-2 transition-all hover:scale-105">
					<div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-400 font-bold text-white">
						02
					</div>
					<span className="font-semibold">Não Sabia</span>
				</div>
				<div className="flex w-full cursor-pointer items-center justify-center space-x-3 rounded-xl border bg-gray-100 p-2 transition-all hover:scale-105">
					<Icon name="stack-outline-light" className="h-8 w-8" />
					<span className="font-semibold">Baralho Principal</span>
				</div>

				<div className="flex w-full items-center justify-evenly space-x-3 rounded-xl border bg-gray-100 p-4">
					<div className="flex flex-col justify-center text-center">
						<span className="font-semibold">Combo</span>
						<span className="text-gray-500">Trabalho</span>
					</div>
					<div className="h-11 border-l-2 border-gray-200" />
					<div className="flex flex-col justify-center text-center">
						<span className="font-semibold">Flashcards</span>
						<span className="text-gray-500">213</span>
					</div>
				</div>
			</div>
		</div>
	)
}

function Card() {
	return (
		<div
			id="card"
			className="h-[580px] w-[380px] rounded-3xl border bg-green-500 bg-gradient-to-r from-green-400 to-green-500 p-3"
		>
			<div className="flex h-full w-full flex-col items-center justify-around rounded-xl border-2 border-white px-5 text-white">
				<div className="flex flex-col">
					<Icon name="circle-wavy-question-fill" className="h-40 w-40" />
					<h1 className="text-center text-3xl font-bold ">
						Processo do Trabalho
					</h1>
				</div>

				<p className="overflow-auto text-center text-lg">
					Quem pode substituir o empregador na audiência trabalhista?
				</p>

				<h3>CLT (processo do Trabalho)</h3>
			</div>
		</div>
	)
}
