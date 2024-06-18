import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { getUserImgSrc } from '#app/utils/misc'
import { countFlashcards } from './flashcards.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		select: { name: true, image: { select: { id: true } } },
		where: { id: userId },
	})

	const comboId = params.comboId
	invariantResponse(comboId, 'ComboId is required', { status: 404 })
	const combo = await prisma.combo.findFirst({
		select: { name: true },
		where: { id: comboId },
	})

	invariantResponse(combo, 'ComboId is required', { status: 404 })
	const { duvida, favorite, naoSabia, sabia, total } = await countFlashcards({
		userId,
		comboId,
	})

	return json({
		duvida,
		favorite,
		naoSabia,
		sabia,
		total,
		combo,
		user,
	})
}

export default function Layout() {
	let { total, combo, user, duvida, naoSabia, sabia, favorite } =
		useLoaderData<typeof loader>()
	let rating = (sabia / total) * 100
	return (
		<div className="flex justify-around">
			<div className="hidden h-min space-y-5 rounded-md bg-white p-5 shadow-md xl:block">
				<div className="flex flex-col">
					<span className="font-bold text-primary">Combo</span>
					<span className="text-gray-400">{combo.name}</span>
				</div>

				<div className="flex flex-col">
					<span className="font-bold text-primary">Flashcards</span>
					<span className="text-gray-400">{total}</span>
				</div>
				<div className="flex flex-col">
					<span className="font-bold text-primary">Favoritados</span>
					<span className="text-gray-400">{favorite}</span>
				</div>
			</div>
			<div className="flex-1">
				<Outlet />
			</div>
			<div className="flex flex-col">
				<div className="hidden flex-col items-center gap-y-3 rounded-2xl p-10 shadow-md xl:flex">
					<div className="-mt-10">
						<img
							src={user ? getUserImgSrc(user.image?.id) : ''}
							alt="imagem avatar usuário"
							className="h-32 w-32 rounded-full border-2 border-white"
						/>
					</div>

					<span className="text-lg font-bold text-[#4F4F4F]">
						Olá, {user?.name.split(' ')[0]}
					</span>

					<span className="text-primary">{combo.name}</span>
					<span className="text-3xl font-bold text-primary ">
						{Number(rating) ? rating.toFixed(0) : '0'}% concluído
					</span>
				</div>
				<div className="hidden flex-col xl:flex">
					<Link to={`type/know`}>
						<button
							id="card-sabia"
							className="w-full"
							name="tipo"
							value="sabia"
						>
							<div className="mt-5 flex h-20 cursor-pointer items-center justify-around rounded-2xl bg-white shadow-xl hover:brightness-90">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DAEBD1] font-bold text-[#007012]">
									{sabia}
								</div>

								<span className="font-bold text-[#007012]">Sabia</span>

								<Icon
									name="emoji-acertei"
									className="h-9 w-9 rounded-full bg-[#DAEBD1] text-[#007012]"
								/>
							</div>
						</button>
					</Link>
					<Link to={`type/noknow`}>
						<button
							id="card-nao-sabia"
							className="w-full"
							type="submit"
							name="tipo"
							value="nao_sabia"
						>
							<div className="mt-2 flex h-20 cursor-pointer items-center justify-around rounded-2xl bg-white shadow-xl hover:brightness-90">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-300 font-bold text-red-500">
									{naoSabia}
								</div>

								<span className="font-bold text-red-500">Nao Sabia</span>

								<div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-300">
									<Icon name="emoji-errei" className="h-11 w-11 text-red-500" />
								</div>
							</div>
						</button>
					</Link>
					<Link to={`type/doubt`}>
						<button
							id="card-duvida"
							className="w-full"
							type="submit"
							name="tipo"
							value="duvida"
						>
							<div className="mt-2 flex h-20 cursor-pointer items-center justify-around rounded-2xl bg-white shadow-xl hover:brightness-90">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-500/10 font-bold text-primary">
									{duvida}
								</div>

								<span className="font-bold text-primary">Dúvida</span>

								<div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10">
									<Icon
										name="emoji-duvida"
										className="h-11 w-11 text-primary"
									/>
								</div>
							</div>
						</button>
					</Link>
				</div>
			</div>
		</div>
	)
}
