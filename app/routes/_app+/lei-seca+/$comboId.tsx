import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'

import {
	Dialog as DialogHeadless,
	DialogBackdrop as DialogBackdropHeadless,
	DialogPanel as DialogPanelHeadless,
	DialogTitle as DialogTitleHeadless,
} from '@headlessui/react'
import { type Prisma, type Quiz } from '@prisma/client'
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
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { CheckboxField, ErrorList, TextareaField } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { MultiCombobox } from '#app/components/ui/multi-combobox'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '#app/components/ui/sheet'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn } from '#app/utils/misc'
import { notifyErrorQuiz } from './lei-seca.server'

const PAGE_SIZE = 10

const schemaAnswerQuiz = z.object({
	intent: z.literal('answer'),
	quizId: z.string(),
	chosenAnswer: z.enum(['V', 'F']),
})
const schemaFavoriteQuiz = z.object({
	intent: z.literal('favorite'),
	quizId: z.string(),
	favorite: z.enum(['yes', 'no']),
})

const notifyErrorSchema = z.object({
	intent: z.literal('notifyError'),
	quizId: z.string(),
	message: z
		.string({ required_error: 'Descreva o erro encontado' })
		.min(20, { message: 'Descreva em mais de 20 caracteres o erro encontrado' })
		.max(500, {
			message: 'Descreva em menos de 500 caracteres o erro encontrado',
		}),
})

const schemaQuiz = z.discriminatedUnion('intent', [
	schemaAnswerQuiz,
	schemaFavoriteQuiz,
	notifyErrorSchema,
])

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const comboId = params.comboId
	invariantResponse(comboId, 'comboId não encontrado', { status: 404 })

	const combo = await prisma.combo.findUnique({
		where: { id: comboId, status: true },
	})
	invariantResponse(combo, 'Combo não encontrado', { status: 404 })
	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const materiaId = url.searchParams.getAll('materiaId')
	const leiId = url.searchParams.getAll('leiId')
	const tituloId = url.searchParams.getAll('tituloId')
	const capituloId = url.searchParams.getAll('capituloId')
	const artigoId = url.searchParams.getAll('artigoId')
	const bancaId = url.searchParams.getAll('bancaId')
	const cargoId = url.searchParams.getAll('cargoId')
	const favorite = !!url.searchParams.get('favorite')

	const whereQuizzes: Prisma.QuizWhereInput = {
		status: true,
		userFavorites: favorite ? { some: { userId } } : undefined,
		cargoId: cargoId.length ? { in: cargoId } : undefined,
		bancaId: bancaId.length ? { in: bancaId } : undefined,
		artigoId: artigoId.length ? { in: artigoId } : undefined,
		artigo: {
			capituloId: capituloId.length ? { in: capituloId } : undefined,
			capitulo: {
				tituloId: tituloId.length ? { in: tituloId } : undefined,
				titulo: {
					leiId: leiId.length ? { in: leiId } : undefined,
					lei: {
						combosLeis: { some: { comboId } },
						materiaId: materiaId.length ? { in: materiaId } : undefined,
					},
				},
			},
		},
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
			userFavorites: { where: { userId } },
		},
		where: whereQuizzes,
		take: PAGE_SIZE,
		skip: (page - 1) * PAGE_SIZE,
	})
	const countQuizzesPromise = prisma.quiz.count({ where: whereQuizzes })
	const countFavoritesPromise = prisma.quizUserFavorites.count({
		where: { userId, quiz: whereQuizzes },
	})

	const materiasPromise = prisma.materia.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			Lei: { some: { combosLeis: { some: { comboId } } } },
		},
	})

	const leisPromise = materiaId.length
		? prisma.lei.findMany({
				select: { id: true, name: true },
				where: {
					status: true,

					combosLeis: { some: { comboId } },
					materiaId: materiaId.length ? { in: materiaId } : undefined,
				},
			})
		: undefined

	const titulosPromise = leiId.length
		? prisma.titulo.findMany({
				select: { id: true, name: true },
				where: {
					status: true,
					leiId: leiId.length ? { in: leiId } : undefined,
					lei: {
						combosLeis: { some: { comboId } },
						materiaId: materiaId.length ? { in: materiaId } : undefined,
					},
				},
			})
		: undefined
	const capitulosPromise = tituloId.length
		? prisma.capitulo.findMany({
				select: { id: true, name: true },
				where: {
					status: true,
					tituloId: tituloId.length ? { in: tituloId } : undefined,
					titulo: {
						leiId: leiId.length ? { in: leiId } : undefined,
						lei: {
							combosLeis: { some: { comboId } },
							materiaId: materiaId.length ? { in: materiaId } : undefined,
						},
					},
				},
			})
		: undefined
	const artigosPromise = capituloId.length
		? prisma.artigo.findMany({
				select: { id: true, name: true },
				where: {
					status: true,
					capituloId: capituloId.length ? { in: capituloId } : undefined,
					capitulo: {
						tituloId: tituloId.length ? { in: tituloId } : undefined,
						titulo: {
							leiId: leiId.length ? { in: leiId } : undefined,
							lei: {
								materiaId: materiaId.length ? { in: materiaId } : undefined,
								combosLeis: { some: { comboId } },
							},
						},
					},
				},
			})
		: undefined

	const bancasPromise = prisma.banca.findMany({
		select: { id: true, name: true },
		where: { status: true },
		orderBy: { name: 'asc' },
	})
	const cargosPromise = prisma.cargo.findMany({
		select: { id: true, name: true },
		where: { status: true },
		orderBy: { name: 'asc' },
	})

	const [
		materias,
		leis,
		titulos,
		capitulos,
		artigos,
		quizzes,
		countQuizzes,
		countFavorites,
		bancas,
		cargos,
	] = await Promise.all([
		materiasPromise,
		leisPromise,
		titulosPromise,
		capitulosPromise,
		artigosPromise,
		quizzesPromise,
		countQuizzesPromise,
		countFavoritesPromise,
		bancasPromise,
		cargosPromise,
	])

	const quizzesMapper = quizzes.map(quiz => ({
		id: quiz.id,
		enunciado: quiz.enunciado,
		comentario: quiz.comentario,
		fundamento: quiz.fundamento,
		ano: quiz.ano,
		favorite: quiz.userFavorites.length > 0,
		banca: quiz.banca ? { id: quiz.banca.id, name: quiz.banca.name } : null,
		cargo: quiz.cargo ? { id: quiz.cargo.id, name: quiz.cargo.name } : null,
		artigo: {
			id: quiz.artigo.id,
			name: quiz.artigo.name,
		},
		capitulo: {
			id: quiz.artigo.capitulo.id,
			name: quiz.artigo.capitulo.name,
		},
		titulo: {
			id: quiz.artigo.capitulo.titulo.id,
			name: quiz.artigo.capitulo.titulo.name,
		},
		lei: {
			id: quiz.artigo.capitulo.titulo.lei.id,
			name: quiz.artigo.capitulo.titulo.lei.name,
		},
		materia: {
			id: quiz.artigo.capitulo.titulo.lei.materia.id,
			name: quiz.artigo.capitulo.titulo.lei.materia.name,
		},
	}))
	return json({
		quizzes: quizzesMapper,
		combo: { id: combo.id, name: combo.name },
		count: countQuizzes,
		materias,
		leis,
		titulos,
		capitulos,
		artigos,
		countFavorites,
		bancas,
		cargos,
	})
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		schema: schemaQuiz.superRefine(async (data, ctx) => {
			if (data.intent === 'notifyError') {
				const { quizId } = data
				const existsNotify = await prisma.notifyErrorQuiz.findFirst({
					where: { fixed: false, quizId, userId },
				})
				if (existsNotify) {
					ctx.addIssue({
						path: [''],
						code: z.ZodIssueCode.custom,
						message:
							'Você já possui uma notificação de erro para este quiz em aberto. Aguarde a verificação da equipe !',
					})
				}
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}
	const { intent } = submission.value
	if (intent === 'answer') {
		const { quizId, chosenAnswer } = submission.value
		const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
		invariantResponse(quiz, 'Quiz não encontrado', { status: 400 })
		const acertou = quiz.verdadeiro === (chosenAnswer === 'V')
		await prisma.quizUserResults.create({
			data: { result: acertou, quizId, userId },
		})
		return json({ acertou, chosenAnswer })
	}

	if (intent === 'favorite') {
		const { quizId, favorite } = submission.value
		if (favorite === 'no') {
			const exists = await prisma.quizUserFavorites.findFirst({
				where: { quizId, userId },
			})
			if (exists) {
				await prisma.quizUserFavorites.delete({
					where: { quizId_userId: { userId, quizId } },
				})
			}
		} else {
			await prisma.quizUserFavorites.upsert({
				where: { quizId_userId: { userId, quizId } },
				create: { userId, quizId },
				update: {},
			})
		}

		return json(null)
	}

	if (intent === 'notifyError') {
		const { message, quizId } = submission.value
		const response = await notifyErrorQuiz(quizId, userId, message)
		if (!response) {
			return json(
				{
					result: submission.reply({
						formErrors: [
							'Problema ao gravar a notificação de erro, entre em contato com o suporte.',
						],
					}),
				},
				{ status: 400 },
			)
		}
		return json({ result: submission.reply({ resetForm: true }) })
	}
	return json(null)
}
export default function LeiSecaComboId() {
	const {
		quizzes,
		combo,
		count,
		materias,
		leis,
		titulos,
		capitulos,
		artigos,
		countFavorites,
		bancas,
		cargos,
	} = useLoaderData<typeof loader>()

	const [searchParams] = useSearchParams()

	const submit = useSubmit()
	const materiaId = searchParams.getAll('materiaId')
	const leiId = searchParams.getAll('leiId')
	const tituloId = searchParams.getAll('tituloId')
	const capituloId = searchParams.getAll('capituloId')
	const artigoId = searchParams.getAll('artigoId')
	const bancaId = searchParams.getAll('bancaId')
	const cargoId = searchParams.getAll('cargoId')
	const searchFavorite = !!searchParams.get('favorite')

	const searchMaterias = materias
		.filter(({ id }) => materiaId.includes(id))
		.map(({ id, name }) => ({ id, name }))

	const searchLeis = leis
		? leis
				.filter(({ id }) => leiId.includes(id))
				.map(({ id, name }) => ({ id, name }))
		: []

	const searchTitulos = titulos
		? titulos
				.filter(({ id }) => tituloId.includes(id))
				.map(({ id, name }) => ({ id, name }))
		: []

	const searchCapitulos = capitulos
		? capitulos
				.filter(({ id }) => capituloId.includes(id))
				.map(({ id, name }) => ({ id, name }))
		: []

	const searchArtigos = artigos
		? artigos
				.filter(({ id }) => artigoId.includes(id))
				.map(({ id, name }) => ({ id, name }))
		: []

	const searchBancas = bancas
		.filter(({ id }) => bancaId.includes(id))
		.map(({ id, name }) => ({ id, name }))
	const searchCargos = cargos
		.filter(({ id }) => cargoId.includes(id))
		.map(({ id, name }) => ({ id, name }))

	const formRef = useRef<HTMLFormElement>(null)

	const [materiasSelected, setMateriasSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchMaterias)
	const [leisSelected, setLeisSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchLeis)
	const [titulosSelected, setTitulosSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchTitulos)
	const [capitulosSelected, setCapitulosSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchCapitulos)

	const [artigosSelected, setArtigosSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchArtigos)
	const [bancasSelected, setbancasSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchBancas)
	const [cargosSelected, setCargosSelected] = useState<
		{
			id: string
			name: string
		}[]
	>(searchCargos)

	const page = Number(searchParams.get('page')) || 1
	function nextPage() {
		const params = new URLSearchParams(searchParams)
		params.set('page', (page + 1).toString())
		return '?' + params.toString()
	}

	useEffect(() => {
		if (formRef.current) {
			submit(formRef.current)
		}
	}, [
		materiasSelected,
		leisSelected,
		titulosSelected,
		capitulosSelected,
		artigosSelected,
		bancasSelected,
		cargosSelected,
		submit,
	])

	return (
		<div>
			<div>
				<div className="flex justify-end text-primary">
					<Sheet>
						<SheetTrigger>
							<button>
								<div className="flex flex-col items-center justify-center rounded-md border border-primary px-1.5 py-1 hover:cursor-pointer hover:bg-primary hover:text-white">
									<Icon name="books" className="h-5 w-5" />
									<span>Filtros</span>
								</div>
							</button>
						</SheetTrigger>
						<SheetContent className="w-[400px] sm:w-[540px]">
							<SheetHeader>
								<SheetTitle>{combo.name}</SheetTitle>
							</SheetHeader>
							<Form
								className="flex flex-col space-y-1"
								ref={formRef}
								id="search-quizzes-form"
								onChange={e => submit(e.currentTarget)}
							>
								<MultiCombobox
									placeholder="Matérias"
									name="materiaId"
									options={materias.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									selectedValues={materiasSelected.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									setSelectedValues={setMateriasSelected}
								/>

								<MultiCombobox
									placeholder="Leis"
									name="leiId"
									options={leis?.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									selectedValues={leisSelected.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									setSelectedValues={setLeisSelected}
								/>

								<MultiCombobox
									placeholder="Temas"
									name="tituloId"
									options={titulos?.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									selectedValues={titulosSelected.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									setSelectedValues={setTitulosSelected}
								/>
								<MultiCombobox
									placeholder="Subtema"
									name="capituloId"
									options={capitulos?.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									selectedValues={capitulosSelected.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									setSelectedValues={setCapitulosSelected}
								/>

								<MultiCombobox
									placeholder="artigos"
									name="artigoId"
									options={artigos?.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									selectedValues={artigosSelected.map(({ id, name }) => ({
										label: name,
										id,
									}))}
									setSelectedValues={setArtigosSelected}
								/>

								<CheckboxField
									labelProps={{
										children: 'Somente Favoritos ?',
									}}
									buttonProps={{
										defaultChecked: searchFavorite,
										form: 'search-quizzes-form',
										name: 'favorite',
										type: 'checkbox',
									}}
								/>
							</Form>

							<div className="mt-5">
								<h2 className="text-xl font-semibold">Filtros:</h2>
								<div className="flex flex-col space-y-1">
									{materiasSelected.length ? (
										<FilteredItem
											name="Matéria: "
											items={materiasSelected}
											setItems={setMateriasSelected}
										/>
									) : null}
									{leisSelected.length ? (
										<FilteredItem
											name="Lei: "
											items={leisSelected}
											setItems={setLeisSelected}
										/>
									) : null}
									{titulosSelected.length ? (
										<FilteredItem
											name="Título: "
											items={titulosSelected}
											setItems={setTitulosSelected}
										/>
									) : null}
									{capitulosSelected.length ? (
										<FilteredItem
											name="Capítulo: "
											items={capitulosSelected}
											setItems={setCapitulosSelected}
										/>
									) : null}
									{artigosSelected.length ? (
										<FilteredItem
											name="Artigo: "
											items={artigosSelected}
											setItems={setArtigosSelected}
										/>
									) : null}
									{bancasSelected.length ? (
										<FilteredItem
											name="Banca: "
											items={bancasSelected}
											setItems={setbancasSelected}
										/>
									) : null}
									{cargosSelected.length ? (
										<FilteredItem
											name="Cargo: "
											items={cargosSelected}
											setItems={setCargosSelected}
										/>
									) : null}
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
				<div className="mx-5 flex items-center justify-center">
					<div className="my-5 flex w-full justify-around rounded-lg  bg-primary  px-5 py-3 text-white shadow-md">
						<div className="flex flex-col items-center justify-center">
							<span className="text-base font-bold">Combo</span>
							<h3 className="text-sm font-normal text-gray-300">
								{combo.name}
							</h3>
						</div>
						<div className="h-10 w-0 border-l-[1px]"></div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-base  font-bold">Quizzes</span>
							<h3 className="text-sm font-normal text-gray-300">
								{count.toString().padStart(2, '0')}
							</h3>
						</div>
						<div className="h-10 w-0 border-l-[1px]"></div>
						<div className="flex flex-col items-center justify-center ">
							<span className="text-base  font-bold">Favoritados</span>
							<h3 className="text-sm font-normal text-gray-300">
								{countFavorites.toString().padStart(2, '0')}
							</h3>
						</div>
					</div>
				</div>
			</div>
			{quizzes.length === 0 ? (
				<div className="flex justify-center text-xl font-bold text-primary">
					Nenhum quiz encontrado, Verifique os Filtros !
				</div>
			) : (
				<div>
					<ul className="space-y-5">
						{quizzes.map((quiz, index) => (
							<CardQuiz
								key={quiz.id}
								index={index}
								quiz={{
									...quiz,
									favorite: quiz.favorite,
									banca: quiz.banca,
									cargo: quiz.cargo,
									lei: quiz.lei,
									materia: quiz.materia,
								}}
							/>
						))}
					</ul>
					<div className="mt-2">
						<div className="flex items-center justify-end">
							{page * PAGE_SIZE < count ? (
								<Link to={nextPage()}>
									<Button>Próxima página</Button>
								</Link>
							) : (
								<span className="text-xl font-bold text-primary">
									{count > 0 ? 'Última página...' : ''}
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

function CardQuiz({
	quiz,
	index,
}: {
	quiz: Pick<Quiz, 'id' | 'enunciado' | 'comentario' | 'fundamento' | 'ano'> & {
		materia: { name: string }
		lei: { name: string }
		banca: { name: string } | null
		cargo: { name: string } | null
		favorite: boolean
	}
	index: number
}) {
	const [open, setOpen] = useState(false)
	const [openNotifyError, setOpenNotifyError] = useState(false)

	const {
		comentario,
		enunciado,
		id,
		ano,
		banca,
		cargo,
		fundamento,
		lei,
		materia,
		favorite,
	} = quiz
	const fetcherAnswer = useFetcher<{ acertou: boolean; chosenAnswer: string }>()

	const quizRespondido = !!fetcherAnswer.data
	const acertou = fetcherAnswer.data?.acertou
	const alternativa = fetcherAnswer.data?.chosenAnswer === 'V'

	const fetcherFavorite = useFetcher()
	let optimisticFavorite = favorite
	if (fetcherFavorite.formData) {
		optimisticFavorite = fetcherFavorite.formData.get('favorite') === 'yes'
	}

	function classesButtonAnswer(item: boolean) {
		if (quizRespondido && alternativa === item) {
			if (acertou) {
				return 'bg-[#D9EAD0] text-[#017013]'
			} else {
				return 'bg-[#F8D8DE] text-[#F45151]'
			}
		}
		return 'border border-primary text-primary  hover:bg-purple-50'
	}

	const [searchParams] = useSearchParams()
	const page = Number(searchParams.get('page')) || 1

	let fecherNotify = useFetcher<{ result: {} }>()
	const [form, fields] = useForm({
		id: `notify-quiz-${id}`,
		constraint: getZodConstraint(notifyErrorSchema),
		lastResult: fecherNotify.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: notifyErrorSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<>
			<li className="flex w-full flex-col space-y-3 rounded-lg border border-primary bg-white px-2 py-2 shadow-lg">
				<div className="flex flex-col space-y-28 pb-10">
					<div>
						<div className="mb-5 flex items-center">
							<span className="mr-5 text-xl font-bold text-primary">
								{((page - 1) * PAGE_SIZE + index + 1)
									.toFixed(0)
									.padStart(2, '0')}
							</span>

							<div className="flex space-x-5  text-xl font-medium text-primary">
								<span>{materia.name}</span>
								<span>{lei.name}</span>
								<span>{ano ? `Ano: ${ano}` : ''}</span>
								<span>
									{banca ? `Banca: ${banca.name.toLocaleUpperCase()}` : ''}
								</span>
								<span>{cargo ? `Cargo: ${cargo.name}` : ''}</span>
							</div>
						</div>
						<div
							className={`whitespace-pre-line  text-justify text-xl font-normal leading-5 text-[#696969]`}
							dangerouslySetInnerHTML={{ __html: enunciado }}
						/>
					</div>

					<fetcherAnswer.Form
						method="post"
						className="flex items-center justify-center space-x-10"
					>
						<input type="hidden" name="intent" value="answer" readOnly />
						<input type="hidden" name="quizId" value={id} readOnly />
						<button
							type="submit"
							aria-label="Verdadeiro"
							name="chosenAnswer"
							disabled={quizRespondido}
							value="V"
							className={`${cn(
								'w-48 rounded-lg border px-5 py-1 text-base font-bold ',
								classesButtonAnswer(true),
							)}`}
						>
							Verdadeiro
						</button>
						<button
							type="submit"
							aria-label="Falso"
							name="chosenAnswer"
							disabled={quizRespondido}
							value="F"
							className={`${cn(
								'w-48 rounded-lg border px-5 py-1 text-base font-bold ',
								classesButtonAnswer(false),
							)}`}
						>
							Falso
						</button>
					</fetcherAnswer.Form>
				</div>
				{quizRespondido && (
					<div>
						<div className="rounded-md border border-dashed border-primary bg-[#F5F6FE] p-5">
							<div className="flex items-center justify-between">
								{acertou ? (
									<span className="text-xl font-bold text-[#017013]">
										Acertou !
									</span>
								) : (
									<span className="text-xl font-bold text-red-500">
										Errou !
									</span>
								)}

								<div className="flex">
									<fetcherFavorite.Form method="post">
										<input
											type="hidden"
											name="intent"
											value="favorite"
											readOnly
										/>
										<input type="hidden" name="quizId" readOnly value={id} />
										<input
											type="text"
											hidden
											name="favorite"
											readOnly
											value={optimisticFavorite ? 'no' : 'yes'}
										/>
										<button className="text-2xl" type="submit">
											{optimisticFavorite ? '❤ ' : '🤍'}
										</button>
									</fetcherFavorite.Form>
									<button
										onClick={() => setOpen(!open)}
										className="ml-5 w-36 rounded-lg border border-primary px-5 py-1 text-base font-bold text-primary hover:bg-purple-50"
									>
										Fundamento
									</button>
								</div>
							</div>
							<h3 className="mb-1 mt-3 text-xl font-normal text-primary">
								Comentário:
							</h3>
							<div
								className="flex whitespace-pre-line text-justify text-xl font-normal text-[#696969]"
								dangerouslySetInnerHTML={{ __html: comentario }}
							/>
						</div>
						<div className="mt-3 flex w-full">
							<button onClick={() => setOpenNotifyError(true)}>
								<div className="flex w-min cursor-pointer space-x-2 border-t-2 px-2 py-2 text-primary transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-gray-100">
									<Icon name="flag" className="h-6 w-6" />
									<span className="w-max">Notificar Erro</span>
								</div>
							</button>

							<div className="w-full flex-1 border-t-2"></div>
						</div>
					</div>
				)}
				<DialogHeadless className="relative z-10" open={open} onClose={setOpen}>
					<DialogBackdropHeadless
						transition
						className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
					/>

					<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
						<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
							<DialogPanelHeadless
								transition
								className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
							>
								<div>
									<DialogTitleHeadless className="text-center text-xl font-bold">
										Fundamento
									</DialogTitleHeadless>

									<div
										className="text-justify"
										dangerouslySetInnerHTML={{
											__html: fundamento || '',
										}}
									/>
								</div>
								<div className="mt-5 sm:mt-6">
									<button
										type="button"
										className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
										onClick={() => setOpen(false)}
									>
										Voltar
									</button>
								</div>
							</DialogPanelHeadless>
						</div>
					</div>
				</DialogHeadless>

				<DialogHeadless
					className="relative z-10"
					open={openNotifyError}
					onClose={() => setOpenNotifyError(false)}
				>
					<DialogBackdropHeadless
						transition
						className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
					/>

					<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
						<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
							<DialogPanelHeadless
								transition
								className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
							>
								<div>
									<fecherNotify.Form
										method="post"
										{...getFormProps(form)}
										className="space-y-1"
									>
										<TextareaField
											labelProps={{
												children: 'Descreva o erro encontrado',
											}}
											textareaProps={{
												...getInputProps(fields.message, { type: 'text' }),
											}}
											errors={fields.message.errors}
										/>
										<ErrorList errors={form.errors} id={form.errorId} />
										<input type="hidden" name="quizId" value={id} readOnly />
										<input
											type="hidden"
											name="intent"
											value="notifyError"
											readOnly
										/>
										<div className="space-x-2">
											<Button>Enviar</Button>
											<Button
												variant="destructive"
												type="button"
												onClick={() => setOpenNotifyError(false)}
											>
												Cancelar
											</Button>
										</div>
									</fecherNotify.Form>
								</div>
							</DialogPanelHeadless>
						</div>
					</div>
				</DialogHeadless>
			</li>
		</>
	)
}

function FilteredItem({
	items,
	setItems,
	name,
}: {
	items: { id: string; name: string }[]
	setItems: React.Dispatch<
		React.SetStateAction<
			{
				id: string
				name: string
			}[]
		>
	>
	name: string
}) {
	return (
		<div className="flex space-x-2 rounded-md  border p-1">
			<div className="flex items-center justify-center space-x-0.5 text-left">
				<div
					onClick={() => setItems([])}
					className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-primary p-1 text-primary"
				>
					<Icon name="x" className="h-20 w-20" />
				</div>
				<span className="font-semibold">{name}</span>
			</div>
			<div className="flex-start flex flex-col space-y-0.5">
				{items.map(({ id, name }) => (
					<div
						key={id}
						className="flex max-w-max items-center space-x-0.5 rounded-md bg-gray-50 px-1 py-0.5 text-[10px]"
					>
						<span>{name}</span>
						<button
							onClick={() => setItems(prev => prev.filter(p => p.id !== id))}
						>
							<div className="flex h-4 w-4 items-center justify-center rounded-full border border-primary p-1 text-primary">
								<Icon name="x" className="h-5 w-5" />
							</div>
						</button>
					</div>
				))}
			</div>
		</div>
	)
}
