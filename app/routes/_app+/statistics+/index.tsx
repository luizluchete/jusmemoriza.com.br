import 'chart.js/auto'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import {
	Form,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { type Tick, type Plugin } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { ClientOnly } from 'remix-utils/client-only'
import leiSecaIcon from '#app/components/ui/img/lei_seca_icon.png'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import {
	buscaTotalizadorQuizzes,
	buscaTotalizadorQuizzesPorMateria,
	quantidadeTotalRespondidaPorMateria,
} from './statistics.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const materiaId = url.searchParams.get('materiaId') || undefined

	const materias = await prisma.materia.findMany({
		where: { status: true },
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})

	const total = await quantidadeTotalRespondidaPorMateria(userId, materiaId)
	const totalQuizzes = await buscaTotalizadorQuizzes(userId)
	const results = await buscaTotalizadorQuizzesPorMateria(userId, materiaId)

	return json({ materias, totalQuizzes, total, results })
}
export default function Statistics() {
	const { totalQuizzes, materias } = useLoaderData<typeof loader>()
	const { corretas, erradas, total } = totalQuizzes
	const submit = useSubmit()
	const [searchParams] = useSearchParams()

	return (
		<div className="flex flex-col space-y-5">
			<div className="flex flex-col justify-between md:flex-row md:space-x-5">
				<div
					id="questoes-adaptadas"
					className="max-h-fit rounded-lg border bg-white p-5 shadow-md"
				>
					<img src={leiSecaIcon} alt="lei-seca-icon" />
					<span className="font-semibold">Questões Adaptadas</span>
				</div>
				<div className="flex-1">
					<dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
						<div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
							<dt className="truncate text-sm font-medium text-gray-500">
								Total Respondidas
							</dt>
							<dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
								{total}
							</dd>
						</div>
						<div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
							<dt className="truncate text-sm font-medium text-green-700">
								Acertos
							</dt>
							<dd className="mt-1 text-3xl font-semibold tracking-tight text-green-700">
								{corretas}
							</dd>
						</div>
						<div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
							<dt className="truncate text-sm font-medium text-red-700">
								Erros
							</dt>
							<dd className="mt-1 text-3xl font-semibold tracking-tight text-red-700">
								{erradas}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			<div className="flex justify-center">
				<Form onChange={e => submit(e.currentTarget)}>
					<Select
						name="materiaId"
						defaultValue={searchParams.get('materiaId') || undefined}
					>
						<SelectTrigger className="w-[240px]">
							<SelectValue placeholder="Selecione uma matéria" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Matérias</SelectLabel>
								{materias.map(materia => (
									<SelectItem key={materia.id} value={materia.id}>
										{materia.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Form>
			</div>
			<ClientOnly key={searchParams.toString()}>
				{() => (
					<div className="flex flex-col space-y-5 lg:flex-row lg:space-x-5 lg:space-y-0">
						<div className="h-96 w-full border bg-white p-5 shadow-md lg:w-2/3">
							<BarChartEstatisticas />
						</div>
						<div className="h-96 w-full rounded-md border bg-white p-5 shadow-md lg:w-1/3">
							<PieCharEstatisticas />
						</div>
					</div>
				)}
			</ClientOnly>
		</div>
	)
}

function BarChartEstatisticas() {
	const { results } = useLoaderData<typeof loader>()
	const innerBarTextPlugin: Plugin = {
		id: 'innerBarText',
		afterDatasetsDraw(chart, args, options) {
			const {
				ctx,
				data,
				chartArea: { left },
				scales: { y },
			} = chart

			ctx.save()

			data.datasets[0].data.forEach((value, index) => {
				ctx.fillStyle = 'black'
				ctx.fillText(
					`${data.labels![index]}`,
					left + 5,
					y.getPixelForValue(index) + 5,
				)
			})

			ctx.restore()
		},
	}
	const options = {
		indexAxis: 'y' as const,
		elements: {
			bar: {
				borderWidth: 2,
			},
		},
		scales: {
			x: {
				beginAtZero: true,
				max: 100,
				ticks: {
					callback: (
						tickValue: string | number,
						index: number,
						ticks: Tick[],
					) => {
						// Your logic here. For example, if you want to convert numbers to strings:
						return tickValue + ' %'
					},
				},
			},
			y: { display: false },
		},
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			innerBarText: {},
			title: { display: false },
			subtitle: { display: false },
			legend: { display: false },
		},
	}
	const data = {
		labels: results.map(data => data.name),
		datasets: [
			{
				axis: 'y',
				barPercentage: 0.9,
				borderWidth: 1,
				maxBarThickness: 20,
				label: '% acertos',
				data: results.map(data =>
					data.total > 0 ? (data.corretas / data.total) * 100 : 0,
				),
				borderColor: (color: any) => {
					const colors =
						results[color.index].corretas / results[color.index].total > 0.5
							? 'rgb(46, 204, 113)'
							: 'rgb(231, 76, 60) '
					return colors
				},
				backgroundColor: (color: any) => {
					const colors =
						results[color.index].corretas / results[color.index].total > 0.5
							? 'rgba(46, 204, 113, 0.5)'
							: 'rgba(231, 76, 60, 0.5)'
					return colors
				},
			},
		],
	}

	return results.length > 0 ? (
		<Bar data={data} options={options} plugins={[innerBarTextPlugin]} />
	) : (
		<div className="flex h-full items-center justify-center">Nenhum dado</div>
	)
}

function PieCharEstatisticas() {
	const {
		total: { corretas, erradas, total },
	} = useLoaderData<typeof loader>()

	const percentualAcertos = Number((corretas / total) * 100) || 0
	const percentualErros = Number((erradas / total) * 100) || 0
	const data = {
		labels: [
			`Acertou ${Math.round(percentualAcertos)}%`,
			`Errou ${Math.round(percentualErros)}%`,
		],
		datasets: [
			{
				data: [percentualAcertos, percentualErros],
				backgroundColor: ['rgba(46, 204, 113, 0.5)', 'rgba(231, 76, 60, 0.5)'],
				borderColor: ['rgb(46, 204, 113)', 'rgb(231, 76, 60) '],
				borderWidth: 1,
				hoverOffset: 4,
			},
		],
	}
	return total > 0 ? (
		<Doughnut
			id="pie-chart"
			data={data}
			options={{ responsive: true, maintainAspectRatio: false }}
		/>
	) : (
		<div className="flex h-full items-center justify-center">Nenhum Dado</div>
	)
}
