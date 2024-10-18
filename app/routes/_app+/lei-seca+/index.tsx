import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	Dialog as DialogHeadless,
	DialogBackdrop as DialogBackdropHeadless,
	DialogPanel as DialogPanelHeadless,
	DialogTitle as DialogTitleHeadless,
} from '@headlessui/react'
import { type Prisma } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	useFetcher,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import React, { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { ErrorList, Field, TextareaField } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '#app/components/ui/command'
import { Icon } from '#app/components/ui/icon'
import { Input } from '#app/components/ui/input'
import { Pagination } from '#app/components/ui/pagination'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'
import { buscaMateriasParaFiltro, notifyErrorQuiz } from './lei-seca.server'
import { type loader as loaderSearch } from './search'

const answerQuizIntent = 'answer'
const schemaAnswer = z.object({
	quizId: z.string(),
	answer: z.enum(['true', 'false']),
})

const notifyErroIntent = 'notify'
const notifyErrorSchema = z.object({
	quizId: z.string(),
	message: z
		.string({ required_error: 'Descreva o erro encontado' })
		.min(20, { message: 'Descreva em mais de 20 caracteres o erro encontrado' })
		.max(500, {
			message: 'Descreva em menos de 500 caracteres o erro encontrado',
		}),
})

const addNoteIntent = 'addNote'
const addNoteSchema = z.object({
	quizId: z.string(),
	note: z
		.string({ required_error: 'Adicione sua anotação' })
		.min(3, { message: 'Sua anotação deve ter no minimo 3 caracteres' })
		.max(250, {
			message: 'Descreva em menos de 250 caracteres',
		})
		.optional(),
})

const addCadernoIntent = 'addCaderno'
const addCadernoSchema = z.object({
	name: z
		.string({ required_error: 'Nome do caderno é obrigatório' })
		.min(3, { message: 'Nome do caderno deve ter no minimo 3 caracteres' }),
})

const addQuizCadernoIntent = 'addQuizCaderno'

const PER_PAGE = 20
export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const searchMaterias = url.searchParams.getAll('materia')
	const searchLeis = url.searchParams.getAll('lei')
	const searchTitulos = url.searchParams.getAll('titulo')
	const searchCapitulos = url.searchParams.getAll('capitulo')
	const searchArtigos = url.searchParams.getAll('artigo')
	const searchBancas = url.searchParams.getAll('banca')
	const searchCargos = url.searchParams.getAll('cargo')
	const searchCadernos = url.searchParams.getAll('caderno')
	const searchTags = url.searchParams.get('tags')
	const page = Number(url.searchParams.get('page')) || 1
	const materias = await buscaMateriasParaFiltro(userId)

	const where: Prisma.QuizWhereInput = {
		artigo: {
			id: searchArtigos.length ? { in: searchArtigos } : undefined,
			capituloId: searchCapitulos.length ? { in: searchCapitulos } : undefined,
			capitulo: {
				tituloId: searchTitulos.length ? { in: searchTitulos } : undefined,
				titulo: {
					leiId: searchLeis.length ? { in: searchLeis } : undefined,
					lei: {
						materia: {
							id: searchMaterias.length ? { in: searchMaterias } : undefined,
						},
					},
				},
			},
		},
		bancaId: searchBancas.length ? { in: searchBancas } : undefined,
		cargoId: searchCargos.length ? { in: searchCargos } : undefined,
		cadernos: searchCadernos.length
			? { some: { caderno: { userId, id: { in: searchCadernos } } } }
			: undefined,
		OR: searchTags
			? [
					{ enunciado: { contains: searchTags, mode: 'insensitive' } },
					{ tags: { contains: searchTags, mode: 'insensitive' } },
				]
			: undefined,
	}

	const quizzes = await prisma.quiz.findMany({
		select: {
			tags: true,
			id: true,
			enunciado: true,
			ano: true,
			banca: {
				select: {
					name: true,
				},
			},
			cargo: {
				select: {
					name: true,
				},
			},
			artigo: {
				select: {
					capitulo: {
						select: {
							titulo: {
								select: {
									lei: {
										select: { name: true, materia: { select: { name: true } } },
									},
								},
							},
						},
					},
				},
			},
			NoteUserQuiz: {
				select: { note: true },
				where: { userId },
			},
		},
		where: where,
		skip: (page - 1) * PER_PAGE,
		take: PER_PAGE,
	})
	const count = await prisma.quiz.count({ where })

	const leis = searchLeis
		? await prisma.lei.findMany({
				select: { name: true },
				where: { id: { in: searchLeis } },
			})
		: []

	const cadernos = await prisma.caderno.findMany({
		select: { name: true, id: true },
		where: { userId },
	})

	const quizzesMapper = quizzes.map(quiz => ({
		id: quiz.id,
		enunciado: quiz.enunciado,
		lei: quiz.artigo.capitulo.titulo.lei.name,
		materia: quiz.artigo.capitulo.titulo.lei.materia.name,
		ano: quiz.ano,
		banca: quiz.banca?.name,
		cargo: quiz.cargo?.name,
		tags: quiz.tags,
		note: quiz.NoteUserQuiz.length ? quiz.NoteUserQuiz[0].note : null,
	}))
	return json({ quizzes: quizzesMapper, materias, leis, count, cadernos })
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)
	const values = Object.fromEntries(formData)
	const { _intent } = values
	if (_intent === answerQuizIntent) {
		return answerQuizAction(userId, formData)
	}

	if (_intent === notifyErroIntent) {
		return notificarErroAction(userId, formData)
	}

	if (_intent === addNoteIntent) {
		return adicionarAnotacaoAction(userId, formData)
	}

	if (_intent === addCadernoIntent) {
		return addCadernoAction(userId, formData)
	}
	if (_intent === addQuizCadernoIntent) {
		return addQuizNoCadernoAction(userId, formData)
	}

	return json(
		{ message: 'invalid intent' },
		{
			status: 400,
			headers: await createToastHeaders({
				type: 'error',
				description: 'invalid intent',
			}),
		},
	)
}

export default function () {
	const { quizzes, materias, leis, count, cadernos } =
		useLoaderData<typeof loader>()
	const [search] = useSearchParams()
	const fetcher = useFetcher<typeof loaderSearch>()
	const submit = useSubmit()
	const page = Number(search.get('page')) || 1

	const [materiasSelected, setMateriasSelected] = useState(
		search.getAll('materia'),
	)
	const [leisSelected, setLeisSelected] = useState(search.getAll('lei'))
	const [titulosSelected, setTitulosSelected] = useState(
		search.getAll('titulo'),
	)
	const [capitulosSelected, setCapitulosSelected] = useState(
		search.getAll('capitulo'),
	)
	const [artigosSelected, setArtigosSelected] = useState(
		search.getAll('artigo'),
	)

	const [bancasSelected, setbancasSelected] = useState(search.getAll('banca'))
	const [cadernosSelected, setCadernosSelected] = useState(
		search.getAll('caderno'),
	)
	const [cargosSelected, setCargosSelected] = useState(search.getAll('cargo'))
	const [campoLivre, setCampoLivre] = useState(search.get('tags') || '')

	const temMateria = materiasSelected.length > 0
	const temLei = leisSelected.length > 0
	const temTitulo = titulosSelected.length > 0
	const temCapitulo = capitulosSelected.length > 0
	function onChangeFilter() {
		const formData = new FormData()
		materiasSelected.forEach(materia => {
			formData.append('materia', materia)
		})
		leisSelected.forEach(lei => {
			formData.append('lei', lei)
		})
		titulosSelected.forEach(titulo => {
			formData.append('titulo', titulo)
		})
		capitulosSelected.forEach(capitulo => {
			formData.append('capitulo', capitulo)
		})
		fetcher.submit(formData, { action: '/lei-seca/search' })
	}

	function onSubmit() {
		const formData = new FormData()
		materiasSelected.forEach(materia => {
			formData.append('materia', materia)
		})
		leisSelected.forEach(lei => {
			formData.append('lei', lei)
		})
		titulosSelected.forEach(titulo => {
			formData.append('titulo', titulo)
		})
		capitulosSelected.forEach(capitulo => {
			formData.append('capitulo', capitulo)
		})
		artigosSelected.forEach(artigo => {
			formData.append('artigo', artigo)
		})
		bancasSelected.forEach(banca => {
			formData.append('banca', banca)
		})
		cargosSelected.forEach(cargo => {
			formData.append('cargo', cargo)
		})
		cadernosSelected.forEach(caderno => {
			formData.append('caderno', caderno)
		})
		campoLivre && formData.set('tags', campoLivre)
		submit(formData)
	}

	useEffect(() => {
		if (!temMateria) {
			setLeisSelected([])
		}
		if (!temLei) {
			setTitulosSelected([])
		}
		if (!temTitulo) {
			setCapitulosSelected([])
		}
		if (!temCapitulo) {
			setArtigosSelected([])
		}
	}, [temMateria, temLei, temTitulo, temCapitulo])

	return (
		<div>
			<div id="filtros">
				<div className="mb-5 flex w-full justify-center gap-2">
					<Icon name="tabler-filter" className="h-5 w-5" />
					<span className="font-semibold">Filtros</span>
				</div>

				<div className="grid w-full grid-flow-row grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5">
					<MultiFiltro
						name="materia"
						placeholder="Materia"
						onChange={onChangeFilter}
						options={materias.map(materia => ({
							id: materia.id,
							label: materia.name,
						}))}
						selected={materiasSelected}
						setSelected={setMateriasSelected}
					/>
					<MultiFiltro
						name="lei"
						placeholder="Lei"
						onChange={onChangeFilter}
						disabled={!temMateria}
						options={
							fetcher.data
								? fetcher.data.leis.map(lei => ({
										id: lei.id,
										label: lei.name,
									}))
								: []
						}
						selected={leisSelected}
						setSelected={setLeisSelected}
					/>
					<MultiFiltro
						name="titulo"
						placeholder="Tema"
						onChange={onChangeFilter}
						disabled={!temLei}
						options={
							fetcher.data
								? fetcher.data.titulos.map(titulo => ({
										id: titulo.id,
										label: titulo.name,
									}))
								: []
						}
						selected={titulosSelected}
						setSelected={setTitulosSelected}
					/>
					<MultiFiltro
						name="capitulo"
						placeholder="SubTema"
						onChange={onChangeFilter}
						disabled={!temTitulo}
						options={
							fetcher.data
								? fetcher.data.capitulos.map(capitulo => ({
										id: capitulo.id,
										label: capitulo.name,
									}))
								: []
						}
						selected={capitulosSelected}
						setSelected={setCapitulosSelected}
					/>
					<MultiFiltro
						name="artigo"
						placeholder="Artigo"
						disabled={!temCapitulo}
						options={
							fetcher.data
								? fetcher.data.artigos.map(artigo => ({
										id: artigo.id,
										label: artigo.name,
									}))
								: []
						}
						selected={artigosSelected}
						setSelected={setArtigosSelected}
					/>
					<MultiFiltro
						name="banca"
						placeholder="Banca"
						options={
							fetcher.data
								? fetcher.data.bancas.map(artigo => ({
										id: artigo.id,
										label: artigo.name,
									}))
								: []
						}
						selected={bancasSelected}
						setSelected={setbancasSelected}
					/>
					<MultiFiltro
						name="cargo"
						placeholder="Cargo"
						options={
							fetcher.data
								? fetcher.data.cargos.map(artigo => ({
										id: artigo.id,
										label: artigo.name,
									}))
								: []
						}
						selected={cargosSelected}
						setSelected={setCargosSelected}
					/>
					<MultiFiltro
						name="caderno"
						placeholder="Meus Cadernos"
						options={cadernos.map(cadernos => ({
							id: cadernos.id,
							label: cadernos.name,
						}))}
						selected={cadernosSelected}
						setSelected={setCadernosSelected}
					/>

					<Input
						placeholder="Palavra chave"
						value={campoLivre}
						onChange={e => setCampoLivre(e.target.value)}
					/>
					<Button onClick={onSubmit}>Buscar</Button>
				</div>
			</div>

			<div id="quizzes" className="mt-3 space-y-5">
				<div className="flex w-full justify-center">
					<span className="text-xl font-extrabold">
						{leis.map(({ name }) => name).join(' / ')}
					</span>
				</div>
				<div className="flex w-full flex-col gap-3 md:flex-row ">
					<div className="flex w-full items-center gap-3 rounded-md border border-gray-200 p-3">
						<div className="flex min-w-10 items-center justify-center rounded-md bg-gray-200 p-2 font-bold">
							{count}
						</div>
						<span className="text-base font-semibold">Total de Questões</span>
					</div>
					<div className="flex w-full items-center gap-3 rounded-md border border-gray-200 p-3">
						<div className="flex min-w-10 items-center justify-center rounded-md bg-[#29DB89] p-2 font-bold text-white">
							{0}
						</div>
						<span className="text-base font-semibold">Resolvidas</span>
					</div>
					<div className="flex w-full items-center gap-3 rounded-md border border-gray-200 p-3">
						<div className="flex min-w-10 items-center justify-center rounded-md bg-[#F75B62] p-2 font-bold text-white">
							{1}
						</div>
						<span className="text-base font-semibold">Não Resolvidas</span>
					</div>
					<div className="flex w-full items-center gap-3 rounded-md border border-gray-200 p-3">
						<span className="text-base font-semibold">
							{`${0}%`} Aproveitamento
						</span>
					</div>
				</div>
				<ul className="flex flex-col gap-4">
					{quizzes.map((quiz, index) => (
						<QuizCard key={quiz.id} quiz={quiz} index={index} />
					))}
				</ul>
				<Pagination
					totalRegisters={count}
					registerPerPage={PER_PAGE}
					currentPage={page}
				/>
			</div>
		</div>
	)
}

async function answerQuizAction(userId: string, formData: FormData) {
	const result = schemaAnswer.parse(Object.fromEntries(formData))
	const { quizId, answer } = result
	const quiz = await prisma.quiz.findFirst({
		select: { comentario: true, fundamento: true, verdadeiro: true },
		where: { id: quizId },
	})

	invariantResponse(quiz, 'Quiz não encontrado', { status: 400 })
	const acertou = quiz.verdadeiro === (answer === 'true')
	await prisma.quizUserResults.create({
		data: { result: acertou, quizId, userId },
	})

	return json({ message: 'success', quiz, answer, acertou })
}

type QuizCardProps = {
	quiz: {
		id: string
		enunciado: string
		lei: string
		materia: string
		ano?: number | null
		banca?: string | null
		cargo?: string | null
		tags?: string | null
		note?: string | null
	}
	index: number
}
function QuizCard({ quiz, index }: QuizCardProps) {
	const fetcher = useFetcher<typeof answerQuizAction>()
	const [openCaderno, setOpenCaderno] = useState(false)
	const isSubmitting = fetcher.state === 'submitting'

	const foiRespondido = !!fetcher.data // se houver dados foi inviado o formulario(respondido)
	const comentario = fetcher.data?.quiz.comentario
	const fundamento = fetcher.data?.quiz.fundamento
	const answer = fetcher.data?.answer
	const acertou = fetcher.data?.acertou

	function classesButtonAnswer(item: boolean) {
		if (foiRespondido && (answer === 'true') === item) {
			if (acertou) {
				return 'bg-[#29DB89] text-white'
			} else {
				return 'bg-red-500 text-white'
			}
		}
		return item
			? 'border-green-500 hover:bg-green-100'
			: 'border-red-500 hover:bg-red-100'
	}

	return (
		<li className="flex flex-col gap-3 rounded-xl border border-gray-300 p-3">
			<div className="flex flex-col items-center justify-start gap-3 md:flex-row">
				<div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 font-bold">
					{index + 1}
				</div>
				{quiz.tags ? <span>{quiz.tags}</span> : null}
				{quiz.ano ? <span>Ano: {quiz.ano}</span> : null}
				{quiz.banca ? <span>Banca: {quiz.banca}</span> : null}
				{quiz.cargo ? <span>Cargo: {quiz.cargo}</span> : null}
			</div>

			<div
				className="text-justify text-base"
				dangerouslySetInnerHTML={{
					__html: quiz.enunciado,
				}}
			/>
			<div>
				<fetcher.Form method="POST">
					<input
						type="hidden"
						hidden
						value={answerQuizIntent}
						name="_intent"
						readOnly
					/>
					<input type="hidden" readOnly value={quiz.id} name="quizId" hidden />
					<div className="flex w-full justify-center">
						<div className="flex w-full max-w-md gap-3 text-xs font-medium">
							<button
								type="submit"
								name="answer"
								value="true"
								disabled={foiRespondido || isSubmitting}
								className={cn(
									'w-full rounded-md border  py-2 font-bold',
									classesButtonAnswer(true),
								)}
							>
								VERDADEIRO
							</button>
							<button
								type="submit"
								name="answer"
								value="false"
								disabled={foiRespondido || isSubmitting}
								className={cn(
									'w-full rounded-md border  py-2 font-bold',
									classesButtonAnswer(false),
								)}
							>
								FALSO
							</button>
						</div>
					</div>
				</fetcher.Form>
				{foiRespondido ? (
					<div
						className={cn(
							'my-3 rounded-md border p-3',
							acertou ? 'border-green-500' : 'border-red-500 ',
						)}
					>
						<div className="flex items-center justify-between">
							{acertou ? (
								<span className="text-xl font-bold text-[#017013]">
									Acertou !
								</span>
							) : (
								<span className="text-xl font-bold text-red-500">Errou !</span>
							)}

							{fundamento ? (
								<div className="flex">
									<ShowFundamento fundamento={fundamento} />
								</div>
							) : null}
						</div>
						<div
							className="text-justify text-base"
							dangerouslySetInnerHTML={{ __html: comentario || '' }}
						/>
					</div>
				) : null}
				<div className="mt-1 flex  justify-center space-x-4 md:justify-start">
					<div
						className="flex cursor-pointer items-center gap-1 transition-all hover:scale-105"
						onClick={() => setOpenCaderno(prev => !prev)}
					>
						<Icon name="single-book" className="h-5 w-5" />
						<span className="text-xs">Caderno</span>
					</div>
					<NotificarErro id={quiz.id} />
					<AdicionarAnotacao quizId={quiz.id} note={quiz.note} />
				</div>
				{openCaderno ? (
					<div className="mt-1">
						<Caderno quizId={quiz.id} />
					</div>
				) : null}
			</div>
		</li>
	)
}

type MultiFiltroProps = {
	name?: string
	icon?: React.ReactNode
	placeholder?: string
	options: { label: string; id: string }[]
	onChange?: () => void
	selected: string[]
	setSelected: React.Dispatch<React.SetStateAction<string[]>>
	disabled?: boolean
}
function MultiFiltro({
	icon,
	placeholder,
	options,
	disabled = false,
	onChange,
	selected,
	setSelected,
	name = '',
}: MultiFiltroProps) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		onChange?.()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected])

	return (
		<>
			{selected.map(id => (
				<input key={id} type="hidden" hidden value={id} name={name} readOnly />
			))}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					asChild
					className={cn('w-full max-w-xs')}
					disabled={disabled}
				>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="h-9 w-full justify-between"
					>
						<div className="flex w-full items-center justify-between">
							<div className="flex space-x-2">
								{icon ? icon : null}
								<span className="text-ellipsis text-nowrap">
									{placeholder || 'Selecione ...'}
								</span>{' '}
							</div>

							{selected.length > 0 ? (
								<span className="text-ellipsis text-nowrap text-xs opacity-50">
									{selected.length} selecionado
								</span>
							) : null}
						</div>

						<Icon
							name="arrow-down"
							className="ml-2 h-4 w-4 shrink-0 opacity-50"
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<Command>
						<CommandInput
							placeholder="Busca rápida"
							onChangeCapture={e => e.stopPropagation()}
						/>
						<CommandEmpty>Nada encontrado</CommandEmpty>
						<CommandList>
							<CommandGroup>
								{options.map(item => (
									<CommandItem
										className="cursor-pointer"
										key={item.id}
										value={item.label}
										onSelect={currentValue => {
											setSelected(prevSelected => {
												return prevSelected.includes(item.id)
													? prevSelected.filter(id => id !== item.id)
													: [...prevSelected, item.id]
											})
										}}
									>
										<div className="flex space-x-2">
											<div className="flex h-5 w-5 items-center justify-center rounded-sm border border-primary shadow-sm hover:shadow-2xl">
												<Icon
													name="check"
													className={cn(
														'h-4 w-4',
														selected.find(id => id === item.id)
															? 'opacity-100'
															: 'opacity-0',
													)}
												/>
											</div>
											<span className="text-wrap opacity-80">{item.label}</span>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</>
	)
}

async function notificarErroAction(userId: string, formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: notifyErrorSchema.superRefine(async ({ quizId }, context) => {
			const existsNotify = await prisma.notifyError.findFirst({
				where: { fixed: false, quizId, userId },
			})
			if (existsNotify) {
				context.addIssue({
					path: [''],
					code: z.ZodIssueCode.custom,
					message:
						'Você já possui uma notificação de erro para este quiz em aberto. Aguarde a verificação da equipe !',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}
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
	let headers = await createToastHeaders({
		type: 'success',
		description: 'Mensagem enviada ao suporte com sucesso!',
	})
	return json({ result: submission.reply() }, { headers })
}
type NotificarErroProps = {
	id: string
}

function NotificarErro({ id }: NotificarErroProps) {
	const fetcher = useFetcher<typeof notificarErroAction>()
	const [open, setOpen] = useState(false)
	const [form, fields] = useForm({
		id: `notify-quiz-${id}`,
		constraint: getZodConstraint(notifyErrorSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: notifyErrorSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const isSubmitting = fetcher.state === 'submitting'
	useEffect(() => {
		if (fetcher.data?.result.status === 'success') {
			setOpen(false)
		}
	}, [fetcher.data?.result.status])
	return (
		<>
			<div
				className="flex cursor-pointer items-center gap-1 transition-all hover:scale-105"
				onClick={() => setOpen(true)}
			>
				<Icon name="flag" className="h-5 w-5" />
				<span className="text-xs">Notificar Erro</span>
			</div>
			<DialogHeadless
				className="relative z-10"
				open={open}
				onClose={() => setOpen(false)}
			>
				<DialogBackdropHeadless
					transition
					className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
				/>

				<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
					<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
						<DialogPanelHeadless
							transition
							className="relative m-5 w-full max-w-xl transform overflow-hidden rounded-lg bg-background p-3 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
						>
							<div>
								<fetcher.Form
									method="post"
									{...getFormProps(form)}
									className="space-y-1"
								>
									<input
										type="hidden"
										name="quizId"
										value={id}
										readOnly
										hidden
									/>
									<input
										type="hidden"
										name="_intent"
										hidden
										value={notifyErroIntent}
										readOnly
									/>
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

									<div className="space-x-2">
										<Button type="submit" disabled={isSubmitting}>
											{isSubmitting ? (
												<Icon name="update" className="animate-spin" />
											) : (
												'Enviar'
											)}
										</Button>
										<Button
											variant="destructive"
											type="button"
											onClick={() => setOpen(false)}
										>
											Cancelar
										</Button>
									</div>
								</fetcher.Form>
							</div>
						</DialogPanelHeadless>
					</div>
				</div>
			</DialogHeadless>
		</>
	)
}

async function adicionarAnotacaoAction(userId: string, form: FormData) {
	const submission = parseWithZod(form, { schema: addNoteSchema })
	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}
	const { note, quizId } = submission.value
	if (note) {
		await prisma.noteUserQuiz.upsert({
			where: { quizId_userId: { quizId, userId } },
			create: { note, quizId, userId },
			update: { note },
		})
	} else {
		const exists = await prisma.noteUserQuiz.findFirst({
			where: { quizId, userId },
		})
		if (exists) {
			await prisma.noteUserQuiz.delete({
				where: { quizId_userId: { quizId, userId } },
			})
		}
	}

	return json(
		{ result: submission.reply() },
		{
			headers: await createToastHeaders({
				type: 'success',
				description: 'Anotação salva com sucesso',
			}),
		},
	)
}
function AdicionarAnotacao({
	quizId,
	note = '',
}: {
	quizId: string
	note?: string | null
}) {
	const fetcher = useFetcher<typeof adicionarAnotacaoAction>()
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState(note || '')
	const isSubmitting = fetcher.state === 'submitting'
	const [form, fields] = useForm({
		id: `note-quiz-${quizId}`,
		constraint: getZodConstraint(addNoteSchema),
		lastResult: fetcher.data?.result,
		defaultValue: {
			note,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: addNoteSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	useEffect(() => {
		if (fetcher.data?.result.status === 'success') {
			setOpen(false)
		}
	}, [fetcher.data])
	return (
		<>
			<div
				className="flex cursor-pointer items-center gap-1 transition-all hover:scale-105"
				onClick={() => setOpen(true)}
			>
				<Icon name="pencil-2" className="h-5 w-5" />
				<span className="text-xs">
					{note ? 'Ver Anotação' : 'Adicionar Anotação'}
				</span>
			</div>
			<DialogHeadless
				className="relative z-10"
				open={open}
				onClose={() => setOpen(false)}
			>
				<DialogBackdropHeadless
					transition
					className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
				/>

				<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
					<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
						<DialogPanelHeadless
							transition
							className="relative m-5 w-full max-w-xl transform overflow-hidden rounded-lg bg-background p-3 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
						>
							<div>
								<h1 className="font-bold">
									Adicione uma anotação ou comentário
								</h1>
								<p className="text-xs">
									Utilize este campo para registrar observações importantes ou
									dúvidas que deseja revisar mais tarde.
								</p>
							</div>
							<fetcher.Form method="post" {...getFormProps(form)}>
								<input
									type="hidden"
									hidden
									value={addNoteIntent}
									name="_intent"
								/>
								<TextareaField
									labelProps={{}}
									textareaProps={{
										...getInputProps(fields.note, { type: 'text' }),
										value: value,
										onChange: e => setValue(e.currentTarget.value),
									}}
									errors={fields.note.errors}
								/>
								<ErrorList errors={form.errors} id={form.errorId} />
								<input type="hidden" name="quizId" value={quizId} readOnly />
								<div className="space-x-2">
									<Button type="submit">
										{isSubmitting ? (
											<Icon name="update" className="animate-spin" />
										) : (
											'Salvar'
										)}
									</Button>
								</div>
							</fetcher.Form>
						</DialogPanelHeadless>
					</div>
				</div>
			</DialogHeadless>
		</>
	)
}

async function addCadernoAction(userId: string, form: FormData) {
	const result = await parseWithZod(form, {
		schema: addCadernoSchema.superRefine(async (data, context) => {
			const exists = await prisma.caderno.findFirst({
				where: { userId, name: { equals: data.name, mode: 'insensitive' } },
			})
			if (exists) {
				context.addIssue({
					path: [''],
					code: z.ZodIssueCode.custom,
					message: 'Já existe um caderno com este nome!',
				})
			}
		}),
		async: true,
	})

	if (result.status !== 'success') {
		return json({ result: result.reply() }, { status: 400 })
	}

	await prisma.caderno.create({
		data: { userId, name: result.value.name },
	})

	return json(
		{
			result: result.reply(),
		},
		{
			headers: await createToastHeaders({
				type: 'success',
				description: 'Caderno criado com sucesso',
			}),
		},
	)
}

async function addQuizNoCadernoAction(userId: string, form: FormData) {
	const values = Object.fromEntries(form)
	const { cadernoId, quizId } = values

	const existsCadernos = await prisma.caderno.findFirst({
		where: { userId, id: String(cadernoId) },
	})

	if (!existsCadernos) {
		return json(
			{ message: 'Caderno não encontrado' },
			{
				status: 400,
				headers: await createToastHeaders({
					type: 'error',
					description: 'Caderno não encontrado !',
				}),
			},
		)
	}

	const exists = await prisma.cadernoQuiz.findFirst({
		where: {
			caderno: { userId, id: String(cadernoId) },
			quizId: String(quizId),
		},
	})

	if (!exists) {
		await prisma.cadernoQuiz.create({
			data: { cadernoId: String(cadernoId), quizId: String(quizId) },
		})
	}

	return json(
		{ message: 'success' },
		{
			headers: await createToastHeaders({
				type: 'success',
				description: 'Quiz adicionado ao caderno com sucesso !',
			}),
		},
	)
}

function Caderno({ quizId }: { quizId: string }) {
	const fetcher = useFetcher<typeof addCadernoAction>()
	const fetcherSave = useFetcher<typeof addQuizNoCadernoAction>()
	const { cadernos } = useLoaderData<typeof loader>()
	const [form, fields] = useForm({
		id: `caderno-quiz-${quizId}`,
		shouldValidate: 'onBlur',
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: addCadernoSchema })
		},
	})
	const isSubmittingAdd = fetcher.state === 'submitting'
	const refFormAdd = useRef<HTMLFormElement>(null)

	useEffect(() => {
		if (fetcher.data?.result.status === 'success') {
			refFormAdd.current?.reset()
		}
	}, [fetcher.data])
	return (
		<div className="flex w-full items-center justify-between">
			<fetcher.Form
				method="post"
				className="flex flex-col"
				{...getFormProps(form)}
				ref={refFormAdd}
			>
				<input
					type="hidden"
					hidden
					name="_intent"
					value={addCadernoIntent}
					readOnly
				/>

				<h3 className="text-h6">Cadastrar Caderno</h3>
				<div className="mt-0.5 flex gap-2">
					<div>
						<Field
							inputProps={getInputProps(fields.name, { type: 'text' })}
							errors={fields.name.errors}
						/>
						<ErrorList errors={form.errors} />
					</div>
					<Button type="submit" disabled={isSubmittingAdd}>
						{isSubmittingAdd ? (
							<Icon name="update" className="animate-spin" />
						) : (
							'Criar'
						)}
					</Button>
				</div>
			</fetcher.Form>
			<fetcherSave.Form method="post">
				<div className="flex gap-2">
					<input
						type="hidden"
						name="_intent"
						value={addQuizCadernoIntent}
						hidden
						readOnly
					/>
					<input type="hidden" name="quizId" value={quizId} hidden readOnly />
					<div className="relative w-[180px]">
						<select
							name="cadernoId"
							className="block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm leading-tight text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						>
							<option value="" disabled selected>
								Selecione um caderno
							</option>
							{cadernos.map(caderno => (
								<option value={caderno.id} key={caderno.id}>
									{caderno.name}
								</option>
							))}
						</select>
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
							<svg
								className="h-4 w-4 fill-current"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
							>
								<path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
							</svg>
						</div>
					</div>

					<Button>Adicionar</Button>
				</div>
			</fetcherSave.Form>
		</div>
	)
}

function ShowFundamento({ fundamento }: { fundamento: string }) {
	const [open, setOpen] = useState(false)
	return (
		<>
			<div
				className="cursor-pointer rounded-lg border border-primary px-5 py-1 text-base font-bold text-primary hover:bg-purple-50"
				onClick={() => setOpen(true)}
			>
				Fundamento
			</div>
			<DialogHeadless className="relative z-10" open={open} onClose={setOpen}>
				<DialogBackdropHeadless
					transition
					className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
				/>

				<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
					<div className="flex min-h-full items-end justify-center  p-4 text-center sm:items-center sm:p-0">
						<DialogPanelHeadless
							transition
							className="relative m-5 w-full max-w-xl transform overflow-hidden rounded-lg bg-background p-3 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
						>
							<div>
								<DialogTitleHeadless className="text-center text-xl font-bold">
									Fundamento
								</DialogTitleHeadless>

								<div
									className="text-justify"
									dangerouslySetInnerHTML={{
										__html: fundamento,
									}}
								/>
							</div>
							<div className="mt-5 sm:mt-6">
								<button
									type="button"
									className="inline-flex w-full max-w-xs justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
									onClick={() => setOpen(false)}
								>
									Fechar
								</button>
							</div>
						</DialogPanelHeadless>
					</div>
				</div>
			</DialogHeadless>
		</>
	)
}
