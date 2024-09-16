import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { json, Outlet, useLoaderData, useSearchParams } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { MultiCombobox } from '#app/components/ui/multi-combobox'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { getUserImgSrc } from '#app/utils/misc'
import {
	buscaLeisParaFiltro,
	buscaMateriasParaFiltro,
	countFlashcards,
} from './flashcards.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		select: {
			name: true,
			image: { select: { id: true } },
		},
		where: { id: userId },
	})
	if (!user) invariantResponse(user, 'User not found', { status: 404 })

	const url = new URL(request.url)
	const tipo = url.searchParams.get('type') || undefined

	const leiId = url.searchParams.getAll('leiId')
	const materias = await buscaMateriasParaFiltro()

	const materiaId = url.searchParams.get('materiaId') || materias[0]?.id
	invariantResponse(materiaId, 'Materia not found', { status: 404 })
	const materia = materias.find(({ id }) => id === materiaId)
	invariantResponse(materia, 'Materia not found', { status: 404 })

	const count = await countFlashcards({ userId, leiId, materiaId, tipo })
	const leis = await buscaLeisParaFiltro(materiaId)
	return json({ user, count, materias, leis, materia })
}

export default function () {
	const { user, count } = useLoaderData<typeof loader>()
	const [seconds, setSeconds] = useState(0)

	const [searchParams, setSearchParams] = useSearchParams()

	const { duvida, naoSabia, sabia } = count
	const rating = (sabia / count.total) * 100

	function changeType(type: string) {
		const newParams = searchParams
		newParams.delete('page')
		type ? newParams.set('type', type) : newParams.delete('type')
		setSearchParams(newParams)
	}
	function calculateAngle(rating: number) {
		// O arco vai de -90 graus (0) a 90 graus (100)
		const angle = (rating / 100) * 180 - 90
		return angle
	}

	useEffect(() => {
		const interval = setInterval(() => {
			setSeconds(seconds => seconds + 1)
		}, 1000)

		return () => clearInterval(interval)
	}, [seconds])

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
	}
	return (
		<div className="mx-auto mt-10 flex h-screen max-h-[800px] min-h-[700px] w-full justify-around">
			<CardFiltros />
			<Outlet />
			<div className="flex h-full w-1/4 max-w-[384px] flex-col justify-between">
				<div className="flex items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4">
					<img
						src={getUserImgSrc(user.image?.id)}
						alt="avatar"
						className="h-9 w-9 rounded-xl object-cover"
					/>
					<span className="text-xl font-semibold">
						Olá, {user?.name.split(' ')[0]}!
					</span>
				</div>

				<div className="flex flex-col items-center justify-center space-y-10">
					<div className="relative">
						<div className="h-[119px] w-[238px] overflow-hidden">
							<div className="flex h-[238px] w-[238px] items-center justify-center rounded-full bg-gradient-to-r from-[#FF5757] via-[#7E9AFB] to-[#27DD86]">
								<div className="flex h-[212px] w-[212px] items-center justify-center rounded-full bg-white"></div>
							</div>
						</div>
						<div className="absolute top-0 flex h-[180px] w-[238px] items-center justify-center  text-black">
							<Icon
								name="rocket"
								className="h-12 w-12 origin-[25px_45px] transform transition-all duration-500"
								style={{ transform: `rotate(${calculateAngle(rating)}deg)` }}
							/>
						</div>
					</div>

					<div className="flex flex-col items-center">
						<span className="text-2xl font-semibold">
							{rating.toFixed(0)}% CONCLUÍDO
						</span>
						<span className="text-xl font-normal">
							Tempo Decorrido: {formatTime(seconds)}
						</span>
					</div>
				</div>

				<div
					onClick={() => changeType('know')}
					className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<div
						id="card-sabia"
						className="flex h-11 w-11 items-center justify-center rounded-md bg-[#29DB89]  text-white"
					>
						{sabia.toString().padStart(2, '0')}
					</div>
					<span className="font-semibold">Sabia</span>
				</div>
				<div
					onClick={() => changeType('doubt')}
					className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<div
						id="card-duvida"
						className="flex h-11 w-11 items-center justify-center rounded-md bg-[#755FFF] text-white"
					>
						{duvida.toString().padStart(2, '0')}
					</div>
					<span className="font-semibold">Dúvida</span>
				</div>
				<div
					onClick={() => changeType('noknow')}
					className="text-semibold flex w-full cursor-pointer items-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<div
						id="card-nao-sabia"
						className="flex h-11 w-11 items-center justify-center rounded-md bg-[#F75B62] text-white"
					>
						{naoSabia.toString().padStart(2, '0')}
					</div>
					<span className="font-semibold">Não Sabia</span>
				</div>
				<div
					onClick={() => changeType('')}
					className="flex w-full cursor-pointer items-center justify-center space-x-3 rounded-xl border border-[#B3B3B3] p-4 text-xl transition-all hover:scale-105"
				>
					<Icon name="stack-outline-light" className="h-8 w-8" />
					<span className="font-semibold">Baralho Principal</span>
				</div>
			</div>
		</div>
	)
}

function CardFiltros() {
	const { count, materias, materia, leis } = useLoaderData<typeof loader>()
	const { total } = count
	const [searchParams, setSearchParams] = useSearchParams()

	const leiId = searchParams.getAll('leiId')
	const searchLeis = leis
		? leis
				.filter(({ id }) => leiId.includes(id))
				.map(({ id, name }) => ({ id, label: name }))
		: []
	const [leisSelected, setLeisSelected] = useState<
		{
			id: string
			label: string
		}[]
	>(searchLeis)

	function handleChangeMateria(materiaId: string) {
		setLeisSelected([])
		const newParams = new URLSearchParams()
		newParams.set('materiaId', materiaId)
		setSearchParams(newParams)
	}

	function handleSubmitFiltros() {
		const newParams = new URLSearchParams()
		newParams.set('materiaId', materia.id)
		if (leisSelected.length > 0) {
			leisSelected.forEach(({ id }) => newParams.append('leiId', id))
		}
		setSearchParams(newParams)
	}
	return (
		<div
			id="first-col"
			className="flex h-full w-1/4 max-w-[384px] flex-col space-y-10"
		>
			<div
				id="filtros"
				className="h-full w-full flex-1 space-y-10  overflow-y-auto rounded-2xl border border-gray-400 py-5"
			>
				<div className="flex w-full justify-center space-x-3">
					<Icon name="tabler-filter" className="h-5 w-5" />
					<span className="text-lg font-bold">Filtros</span>
				</div>

				<div className="flex w-full flex-col justify-center space-y-5 px-5">
					<Select
						defaultValue={materia.id}
						name="materiaId"
						onValueChange={handleChangeMateria}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Matéria" />
						</SelectTrigger>
						<SelectContent>
							{materias.map(({ id, name }) => (
								<SelectItem key={id} value={id}>
									{name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<MultiCombobox
						icon={<Icon name="lei" className="h-5 w-5" />}
						placeholder="Leis"
						name="leiId"
						options={leis?.map(({ id, name }) => ({
							label: name,
							id,
						}))}
						selectedValues={leisSelected}
						setSelectedValues={setLeisSelected}
					/>
					<Button onClick={handleSubmitFiltros}>Buscar</Button>
				</div>
			</div>
			<div className="flex w-full items-center justify-evenly space-x-3 rounded-xl border border-gray-400 p-4">
				<div className="flex flex-col justify-center text-center">
					<span className="font-semibold">Combo</span>
					<span className="text-gray-500">Trabalho</span>
				</div>
				<div className="h-11 border-l-2 border-gray-400" />
				<div className="flex flex-col justify-center text-center">
					<span className="font-semibold">Flashcards</span>
					<span className="text-gray-500">
						{total.toString().padStart(2, '0')}
					</span>
				</div>
			</div>
		</div>
	)
}
