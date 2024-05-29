import { type Prisma } from '@prisma/client'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	useFetcher,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { Field } from '#app/components/forms'
import { Icon } from '#app/components/ui/icon'
import { Pagination } from '#app/components/ui/pagination'
import { prisma } from '#app/utils/db.server'
import { createToastHeaders } from '#app/utils/toast.server'
const ITEMS_PER_PAGE = 15
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)

	const page = Number(url.searchParams.get('page')) || 1
	const search = url.searchParams.get('search') || undefined
	const materiaId = url.searchParams.get('materiaId') || undefined
	const leiId = url.searchParams.get('leiId') || undefined
	const tituloId = url.searchParams.get('tituloId') || undefined
	const capituloId = url.searchParams.get('capituloId') || undefined
	const artigoId = url.searchParams.get('artigoId') || undefined

	const materiasPromise = prisma.materia.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	})

	const leisPromise = prisma.lei.findMany({
		orderBy: { name: 'asc' },
		where: { materiaId },
		select: { id: true, name: true },
	})
	const titulosPromise = prisma.titulo.findMany({
		where: { lei: { id: leiId, materiaId } },
	})
	const capitulosPromise = prisma.capitulo.findMany({
		where: { tituloId, titulo: { leiId, lei: { materiaId } } },
	})
	const artigosPromise = prisma.artigo.findMany({
		where: {
			capituloId,
			capitulo: { tituloId, titulo: { leiId, lei: { materiaId } } },
		},
	})
	const [materias, leis, titulos, capitulos, artigos] = await Promise.all([
		materiasPromise,
		leisPromise,
		titulosPromise,
		capitulosPromise,
		artigosPromise,
	])

	const whereQuiz: Prisma.QuizWhereInput = {
		artigoId,
		artigo: {
			capituloId,
			capitulo: { tituloId, titulo: { leiId, lei: { materiaId } } },
		},
		OR: search
			? [
					{ enunciado: { contains: search, mode: 'insensitive' } },
					{ comentario: { contains: search, mode: 'insensitive' } },
					{ fundamento: { contains: search, mode: 'insensitive' } },
				]
			: undefined,
	}

	const quizzesPromise = prisma.quiz.findMany({
		include: {
			banca: true,
			cargo: true,
			artigo: {
				include: {
					capitulo: {
						include: {
							titulo: { include: { lei: { include: { materia: true } } } },
						},
					},
				},
			},
		},
		where: whereQuiz,
		orderBy: { createdAt: 'desc' },
		take: ITEMS_PER_PAGE,
		skip: (page - 1) * ITEMS_PER_PAGE,
	})
	const countPromise = prisma.quiz.count({ where: whereQuiz })

	const [quizzes, count] = await Promise.all([quizzesPromise, countPromise])
	return json({ materias, leis, titulos, capitulos, artigos, quizzes, count })
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const values = Object.fromEntries(formData.entries())

	if (values._action === 'delete') {
		const id = values.id + ''
		await prisma.quiz.delete({ where: { id } })
		const toastHeaders = await createToastHeaders({
			title: 'Deletado',
			description: 'Quiz deletado com sucesso !',
		})
		return json({ status: 'success' } as const, { headers: toastHeaders })
	}
	return json(null)
}

export default function Index() {
	const { materias, leis, titulos, capitulos, artigos, quizzes, count } =
		useLoaderData<typeof loader>()

	const [searchParams] = useSearchParams()
	const fetcher = useFetcher()
	const submit = useSubmit()
	return (
		<>
			<div className="px-4 sm:px-6 lg:px-8">
				<div className="sm:flex sm:items-center">
					<div className="sm:flex-auto">
						<h1 className="text-base font-semibold leading-6 text-gray-900">
							Quiz
						</h1>
						<p className="mt-2 text-sm text-gray-700">
							Total de registros encontrados {count}
						</p>
					</div>
					<div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
						<button
							type="button"
							className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>
							<Link to="new">Adicionar +</Link>
						</button>
					</div>
				</div>
				<Form className="mt-3">
					<Field
						inputProps={{
							type: 'text',
							name: 'search',
							defaultValue: searchParams.get('search') || '',
							placeholder: 'Filtro Enunciado, comentário e fundamento',
						}}
					/>
					<div className="flex w-full flex-col justify-between space-x-2 md:flex-row">
						<select
							name="materiaId"
							onChange={e => submit(e.currentTarget.form)}
							defaultValue={searchParams.get('materiaId') || ''}
							className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Materias...</option>
							{materias.map(materia => (
								<option key={materia.id} value={materia.id}>
									{materia.name}
								</option>
							))}
						</select>
						<select
							name="leiId"
							defaultValue={searchParams.get('leiId') || ''}
							onChange={e => submit(e.currentTarget.form)}
							className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Leis...</option>
							{leis.map(lei => (
								<option key={lei.id} value={lei.id}>
									{lei.name}
								</option>
							))}
						</select>
						<select
							name="tituloId"
							defaultValue={searchParams.get('tituloId') || ''}
							onChange={e => submit(e.currentTarget.form)}
							className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Títulos...</option>
							{titulos.map(titulo => (
								<option key={titulo.id} value={titulo.id}>
									{titulo.name}
								</option>
							))}
						</select>
						<select
							name="capituloId"
							defaultValue={searchParams.get('capituloId') || ''}
							onChange={e => submit(e.currentTarget.form)}
							className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Capitulos...</option>
							{capitulos.map(capitulo => (
								<option key={capitulo.id} value={capitulo.id}>
									{capitulo.name}
								</option>
							))}
						</select>
						<select
							name="artigoId"
							defaultValue={searchParams.get('artigoId') || ''}
							onChange={e => submit(e.currentTarget.form)}
							className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Artigos...</option>
							{artigos.map(artigo => (
								<option key={artigo.id} value={artigo.id}>
									{artigo.name}
								</option>
							))}
						</select>
					</div>
					<button
						type="submit"
						className="mt-2 block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>
						Buscar
					</button>
				</Form>
				<div className="mt-8 flow-root">
					<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
						<div className="inline-block min-w-full py-2 align-middle">
							<table className="min-w-full divide-y divide-gray-300">
								<thead>
									<tr className="w-full">
										<th
											scope="col"
											className="w-10/12 py-1 text-left text-sm font-semibold text-gray-900 "
										>
											Enunciado / Comentário / Fundamento
										</th>
										<th
											scope="col"
											className="w-2/12 py-1 text-left text-sm font-semibold text-gray-900"
										>
											Matéria / Lei / Titulo / Capitulo / Artigo
										</th>
										<th scope="col" className="relative py-3.5">
											<span className="sr-only">Edit</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y-8 divide-gray-200 bg-white">
									{quizzes.map(quiz => (
										<tr key={quiz.id} className="w-full">
											<td className="flex w-10/12 flex-col  divide-y whitespace-normal py-1  text-sm font-medium text-gray-900">
												<div
													dangerouslySetInnerHTML={{ __html: quiz.enunciado }}
												/>
												<div
													dangerouslySetInnerHTML={{ __html: quiz.comentario }}
												/>
												<div
													dangerouslySetInnerHTML={{
														__html: quiz.fundamento || '',
													}}
												/>
											</td>
											<td className="w-3/12 whitespace-normal py-1 text-sm text-gray-500">
												<div className="flex flex-col divide-y">
													<span className="font-bold">
														{quiz.artigo.capitulo.titulo.lei.materia.name.toUpperCase()}
													</span>
													<span className="font-semibold">
														{quiz.artigo.capitulo.titulo.lei.name.toUpperCase()}
													</span>
													<span>{quiz.artigo.capitulo.titulo.name}</span>
													<span>{quiz.artigo.capitulo.name.toUpperCase()}</span>
													<span>{quiz.artigo.name.toUpperCase()}</span>
												</div>
											</td>
											<td className="whitespace-nowrap px-3 py-1 text-sm ">
												<div className="flex justify-around gap-x-3">
													<Link
														to={`${quiz.id}/edit`}
														preventScrollReset
														className="text-indigo-600 hover:text-indigo-900"
													>
														Editar<span className="sr-only">, {quiz.id}</span>
													</Link>
													<fetcher.Form method="post" className="h-full">
														<input
															type="text"
															hidden
															name="id"
															defaultValue={quiz.id}
														/>
														<button
															type="submit"
															name="_action"
															onClick={event => {
																if (!confirm('Confirma a exclusão ?')) {
																	event.preventDefault()
																}
															}}
															value="delete"
														>
															<Icon
																name="trash"
																className="hover:text-red-500"
															/>
														</button>
													</fetcher.Form>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<Pagination
								totalRegisters={count}
								registerPerPage={ITEMS_PER_PAGE}
								currentPage={Number(searchParams.get('page')) || 1}
							/>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
