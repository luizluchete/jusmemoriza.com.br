import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import flashcardsIcon from '#app/components/ui/img/flashcards_icon.png'
import leiSecaIcon from '#app/components/ui/img/lei_seca_icon.png'
import minhasListasIcon from '#app/components/ui/img/my_cards_icon.png'
import estatisticasIcon from '#app/components/ui/img/statistics_icon.png'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { getUserImgSrc } from '#app/utils/misc'
import {
	buscaMateriasMaisRespondidas,
	buscaResultadosMesAtual,
	buscaResultadosQuizzesUltimos6M,
} from './home.server'

export const meta: MetaFunction = () => [
	{
		title: 'Inicio | JusMemoriza',
	},
]

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			image: { select: { id: true } },
		},
	})
	invariantResponse(user, 'User not found', { status: 404 })

	const [results, materias, currentResults] = await Promise.all([
		buscaResultadosQuizzesUltimos6M(userId),
		buscaMateriasMaisRespondidas(userId),
		buscaResultadosMesAtual(userId),
	])

	return json({ user, results, materias, currentResults })
}

export default function () {
	const { user, currentResults } = useLoaderData<typeof loader>()
	return (
		<div>
			<div className="flex flex-col">
				<h1 className='className="text-base text-gray-900" mb-5 font-semibold leading-6'>
					Selecione o conteúdo
				</h1>
				<div className="flex space-x-5">
					<ul className="grid w-full grid-cols-2 gap-5 lg:grid-cols-4">
						<li>
							<Link to="/lei-seca">
								<div className="flex w-full max-w-xs cursor-pointer flex-col items-start rounded-3xl bg-primary p-4 py-6 shadow-sm shadow-primary">
									<div className="flex w-full  justify-between">
										<img
											src={leiSecaIcon}
											alt={'lei-seca-icon'}
											height="48"
											width="48"
										/>
									</div>
									<span className="text-lg font-bold text-white">Lei seca</span>
								</div>
							</Link>
						</li>
						<li>
							<Link to="/flashcards">
								<div className="flex w-full max-w-xs cursor-pointer flex-col items-start rounded-3xl bg-primary p-4 py-6 shadow-sm shadow-primary">
									<div className="flex w-full  justify-between">
										<img
											src={flashcardsIcon}
											alt={'flashcards-icon'}
											height="48"
											width="48"
										/>
									</div>
									<span className="text-lg font-bold text-white">
										Flashcards
									</span>
								</div>
							</Link>
						</li>
						<li>
							<Link to="/lists">
								<div className="flex w-full max-w-xs cursor-pointer flex-col items-start rounded-3xl bg-primary p-4 py-6 shadow-sm shadow-primary">
									<div className="flex w-full  justify-between">
										<img
											src={minhasListasIcon}
											alt={'listas-icon'}
											height="48"
											width="48"
										/>
									</div>
									<span className="text-lg font-bold text-white">
										Minhas listas
									</span>
								</div>
							</Link>
						</li>
						<li>
							<Link to="/statistics">
								<div className="flex w-full max-w-xs cursor-pointer flex-col items-start rounded-3xl bg-primary p-4 py-6 shadow-sm shadow-primary">
									<div className="flex w-full  justify-between">
										<img
											src={estatisticasIcon}
											alt={'estatisticas-icon'}
											height="48"
											width="48"
										/>
									</div>
									<span className="text-lg font-bold text-white">
										Estatisticas
									</span>
								</div>
							</Link>
						</li>
					</ul>
					<div className="hidden w-80 justify-center rounded-xl border bg-white px-16 py-1 shadow-md xl:block">
						<div className="relative -top-10">
							<div className="flex w-full flex-col items-center justify-center">
								<div className="-top-10 flex h-32 w-32 items-center justify-center rounded-full border-2 border-white">
									<img
										className="absolute h-32 w-32 rounded-full"
										height={120}
										width={120}
										src={user ? getUserImgSrc(user.image?.id) : ''}
										alt="user-avatar"
									/>
								</div>
							</div>
							<div className="relative text-center">
								<h4 className="text-lg font-bold text-[#4F4F4F] ">
									Olá, {user.name.split(' ')[0]}
								</h4>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="flex justify-between space-x-5">
				<GraficoLinha />
				<CardMaterias />
			</div>
			<div className="mt-5">
				<h3 className="text-base font-semibold leading-6 text-gray-900">
					Questões do Mês atual
				</h3>
				<dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
					<div className="px-4 py-5 sm:p-6">
						<dt className="text-base font-normal text-gray-900">
							Questões respondidas
						</dt>
						<dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
							<div className="flex items-baseline text-2xl font-semibold text-indigo-600">
								{currentResults.total}
							</div>
						</dd>
					</div>
					<div className="px-4 py-5 sm:p-6">
						<dt className="text-base font-normal text-gray-900">
							Questões corretas
						</dt>
						<dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
							<div className="flex items-baseline text-2xl font-semibold text-green-600">
								{currentResults.corretas}
							</div>
						</dd>
					</div>
					<div className="px-4 py-5 sm:p-6">
						<dt className="text-base font-normal text-gray-900">
							Questões erradas
						</dt>
						<dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
							<div className="flex items-baseline text-2xl font-semibold text-red-600">
								{currentResults.total - currentResults.corretas}
							</div>
						</dd>
					</div>
				</dl>
			</div>
		</div>
	)
}

function CardMaterias() {
	const { materias } = useLoaderData<typeof loader>()
	return (
		<div id="rating-materias" className="hidden xl:block">
			<div className="flex w-full justify-end">
				<Link
					to="/statistics"
					className="mb-2 mt-5 text-end text-base font-bold text-primary underline"
				>
					+ mais detalhes
				</Link>
			</div>
			<div className="flex h-80 w-80 flex-col rounded-xl border bg-white py-2 shadow-md">
				<h3 className="mb-5 text-center text-base font-bold text-[#4F4F4F]">
					Matérias mais respondidas
				</h3>
				<div className="flex flex-col justify-center px-5">
					{materias.length === 0 ? (
						<div className="text-center">Nenhum dado encontrado</div>
					) : null}
					{materias.map(materia => (
						<div key={materia.id} className="mb-5 flex w-full flex-col">
							<div className="flex justify-between text-xs font-medium text-[#4F4F4F]">
								<span>{materia.nome}</span>{' '}
								<span>{materia.percentual.toFixed(2)}%</span>
							</div>
							<div className="h-2 w-full rounded-full bg-gray-200 ">
								<div
									className="h-2 rounded-full bg-primary"
									style={{ width: `${materia.percentual}%` }}
								></div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function GraficoLinha() {
	const { results } = useLoaderData<typeof loader>()
	const optionsLineChart = {
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom' as const,
				align: 'start' as const,
			},
			title: {
				display: true,
				position: 'left' as const,
				text: 'Quizzes ( últ. 6M)',
			},
		},
	}
	ChartJS.register(
		CategoryScale,
		LinearScale,
		PointElement,
		LineElement,
		Title,
		Tooltip,
		Legend,
	)

	const dadosGraficoLinha = {
		labels: results.map(result => result.mesAno),
		datasets: [
			{
				label: 'Resolvidas',
				data: results.map(result => result.total),
				borderColor: '#32297C',
				backgroundColor: '#32297C',
			},
			{
				label: 'Incorretas',
				data: results.map(result => result.total - result.corretas),
				borderColor: 'red',
				backgroundColor: 'red',
			},
			{
				label: 'Corretas',
				data: results.map(result => result.corretas),
				borderColor: 'green',
				backgroundColor: 'green',
			},
		],
	}
	return (
		<div id="grafico-inicio-geral" className="w-full">
			<h2 className="mb-2 mt-5 text-base font-semibold leading-6 text-gray-900">
				Estatísticas mensal das questões adaptadas
			</h2>

			<div className="h-80 max-h-80 rounded-xl border bg-white p-3 shadow-md">
				<Line
					data={dadosGraficoLinha ?? []}
					className="h-80"
					options={{ ...optionsLineChart, maintainAspectRatio: false }}
				/>
			</div>
		</div>
	)
}
