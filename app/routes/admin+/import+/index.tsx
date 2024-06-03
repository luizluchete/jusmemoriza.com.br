import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type ActionFunctionArgs,
	json,
	unstable_parseMultipartFormData,
	unstable_createMemoryUploadHandler,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import Papa from 'papaparse'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { prisma } from '#app/utils/db.server.js'
import { getErrorMessage, useIsPending } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'

const MAX_SIZE = 1024 * 1024 * 10 // 10MB

const csvLineQuizSchema = z.object({
	materia: z.string().trim().min(1),
	lei: z.string().trim().min(1),
	titulo: z.string().trim().optional(),
	capitulo: z.string().trim().optional(),
	artigo: z.string().trim().optional(),
	enunciado: z.string().trim().min(1),
	comentario: z.string().trim().min(1),
	fundamento: z.string().trim().optional(),
	gabarito: z.string(),
	campo_livre: z.string().optional(),
	ano: z.coerce.number().optional(),
	banca: z.string().optional(),
	cargo: z.string().optional(),
})

const arrayQuiz = z.array(csvLineQuizSchema)
const fileSchema = z.object({
	file: z
		.instanceof(File)
		.refine(file => file.size > 0, 'Image is required')
		.refine(
			file => file.size <= MAX_SIZE,
			'O tamanho do arquivo deve ser inferior a 3 MB',
		),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)

	const submission = await parseWithZod(formData, {
		schema: fileSchema.transform(async data => {
			if (data.file.size <= 0) return z.NEVER
			return {
				file: {
					contentType: data.file.type,
					blob: Buffer.from(await data.file.arrayBuffer()),
				},
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { file } = submission.value

	const { data } = Papa.parse(file.blob.toString(), {
		skipEmptyLines: true,
		header: true,
	})
	const result = arrayQuiz.safeParse(data)
	if (!result.success) {
		return json(
			{
				result: submission.reply({
					formErrors: ['problema ao processar arquivo csv'],
				}),
				status: submission.status,
			},
			{ status: 400 },
		)
	}

	let error: string
	try {
		// validar se todas as materias existem
		const quizWithMateria = await Promise.all(
			result.data.map(async (quiz, index) => {
				const materia = await prisma.materia.findFirst({
					select: { id: true },
					where: { name: { equals: quiz.materia, mode: 'insensitive' } },
				})
				if (!materia) {
					error = `linha ${index} Materia ${quiz.materia} não cadastrada`
					throw new Error(error)
				}
				return { ...quiz, materiaId: materia.id }
			}),
		)

		// validar se todas as leis existem
		const quizWithLei = await Promise.all(
			quizWithMateria.map(async quiz => {
				const lei = await prisma.lei.findFirst({
					select: { id: true },
					where: {
						name: { equals: quiz.lei, mode: 'insensitive' },
						materiaId: quiz.materiaId,
					},
				})
				if (!lei) {
					error = `Lei ${quiz.lei} na materia ${quiz.materia} não cadastrada`
					throw new Error(error)
				}
				return { ...quiz, leiId: lei.id }
			}),
		)

		// validar se todos os titulos existem, se não existir criar e se for null criar um titulo com o nome da lei
		type typeQuizWithTitulo = (typeof quizWithLei)[number] & {
			tituloId: string
			titulo: string
		}
		const quizWithTitulo: typeQuizWithTitulo[] = []

		for (const quiz of quizWithLei) {
			let tituloName = quiz.titulo
			if (!tituloName) {
				tituloName = quiz.lei
			}
			let tituloExists = await prisma.titulo.findFirst({
				select: { id: true },
				where: {
					name: { equals: tituloName, mode: 'insensitive' },
					leiId: quiz.leiId,
				},
			})

			if (!tituloExists) {
				tituloExists = await prisma.titulo.create({
					data: {
						name: tituloName,
						leiId: quiz.leiId,
					},
				})
			}
			quizWithTitulo.push({
				...quiz,
				tituloId: tituloExists.id,
				titulo: tituloName,
			})
		}

		// validar se todos os capitulos existem, se não existir criar e se for null criar um capitulo com o nome do titulo
		const quizWithCapitulo: typeof quizWithTitulo &
			{ capituloId: string; capitulo: string }[] = []

		for (const quiz of quizWithTitulo) {
			let capituloName = quiz.capitulo
			if (!capituloName) {
				capituloName = quiz.titulo
			}
			let capituloExists = await prisma.capitulo.findFirst({
				select: { id: true },
				where: {
					name: { equals: capituloName, mode: 'insensitive' },
					tituloId: quiz.tituloId,
				},
			})

			if (!capituloExists) {
				capituloExists = await prisma.capitulo.create({
					data: {
						name: capituloName,
						tituloId: quiz.tituloId,
					},
				})
			}
			quizWithCapitulo.push({
				...quiz,
				capituloId: capituloExists.id,
				capitulo: capituloName,
			})
		}

		//valida se todos os artigos existem, se não existir criar e se for null criar um artigo com o nome do capitulo
		const quizWithArtigo: Array<
			(typeof quizWithCapitulo)[number] & { artigoId: string; artigo: string }
		> = []

		for (const quiz of quizWithCapitulo) {
			let artigoName = quiz.artigo
			if (!artigoName) {
				artigoName = quiz.capitulo
			}
			let artigoExists = await prisma.artigo.findFirst({
				select: { id: true },
				where: {
					name: { equals: artigoName, mode: 'insensitive' },
					capituloId: quiz.capituloId,
				},
			})

			if (!artigoExists) {
				artigoExists = await prisma.artigo.create({
					data: {
						name: artigoName,
						capituloId: quiz.capituloId,
					},
				})
			}
			quizWithArtigo.push({
				...quiz,
				artigoId: artigoExists.id,
				artigo: artigoName,
			})
		}

		//verifica se existe as bancas e cargos, se existir já preenche o id senão retorna erro

		const finalQUizzes = await Promise.all(
			quizWithArtigo.map(async quiz => {
				let bancaId
				let cargoId
				if (quiz.banca) {
					const banca = await prisma.banca.findFirst({
						select: { id: true },
						where: { name: { equals: quiz.banca, mode: 'insensitive' } },
					})
					if (!banca) {
						error = `Banca ${quiz.banca} não cadastrada`
						throw new Error(error)
					}
					bancaId = banca.id
				}
				if (quiz.cargo) {
					const cargo = await prisma.cargo.findFirst({
						select: { id: true },
						where: { name: { equals: quiz.cargo, mode: 'insensitive' } },
					})
					if (!cargo) {
						error = `Cargo ${quiz.cargo} não cadastrado`
						throw new Error(error)
					}
					cargoId = cargo.id
				}
				return { ...quiz, bancaId, cargoId }
			}),
		)

		// GRAVANDO OS QUIZZES NO BANCO DE DADOS
		await prisma.$transaction(
			finalQUizzes.map(quiz =>
				prisma.quiz.create({
					data: {
						enunciado: quiz.enunciado,
						comentario: quiz.comentario,
						fundamento: quiz.fundamento,
						verdadeiro: quiz.gabarito === 'V',
						tags: quiz.campo_livre,
						artigoId: quiz.artigoId,
						ano: quiz.ano,
						bancaId: quiz.bancaId,
						cargoId: quiz.cargoId,
					},
				}),
			),
		)
	} catch (error) {
		return json(
			{
				result: submission.reply({ formErrors: [getErrorMessage(error)] }),
			},
			{ status: 400 },
		)
	}
	return json(
		{ result: submission.reply() },
		{
			headers: await createToastHeaders({
				description: 'Arquivo importado com sucesso',
				type: 'success',
			}),
		},
	)
}
export default function Layout() {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'import-quizzes',
		constraint: getZodConstraint(fileSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: fileSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const [loadingRead, setLoadingRead] = useState(false)
	const [quizzes, setQuizzes] = useState<z.infer<typeof csvLineQuizSchema>[]>(
		[],
	)
	const [errors, setErrors] = useState<
		{ row: number; path: string; message: string }[]
	>([])

	const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuizzes([])
		setErrors([])
		const file = e.currentTarget.files?.[0]
		if (file) {
			let line = 0
			const reader = new FileReader()
			reader.readAsDataURL(file)
			reader.onload = () => {
				setLoadingRead(true)
				if (reader.result) {
					Papa.parse(file, {
						skipEmptyLines: true,
						step(value, parser) {
							line++
							//validar com zod
							const result = csvLineQuizSchema.safeParse(value.data)
							if (!result.success) {
								const errorDetails = result.error.errors.map(error => ({
									row: line,
									path: error.path.join('.'),
									message: error.message,
								}))
								setErrors(errors => [...errors, ...errorDetails])
								return
							}
							setQuizzes(quizzes => [...quizzes, result.data])
						},
						header: true,
						complete() {
							setLoadingRead(false)
						},
						error() {
							setLoadingRead(false)
						},
					})
				}
			}
		}
	}

	useEffect(() => {
		if (actionData?.result.status === 'success') {
			setQuizzes([])
			setErrors([])
		}
	}, [actionData])

	return (
		<>
			{loadingRead ? <div>Carregando...</div> : null}
			<Form method="POST" encType="multipart/form-data" {...getFormProps(form)}>
				<input
					{...getInputProps(fields.file, { type: 'file' })}
					accept=".csv"
					className="peer sr-only"
					required
					onChange={onChangeFile}
				/>

				<ErrorList errors={fields.file.errors} id={fields.file.id} />
				<div className="flex space-x-2">
					<Button
						asChild
						className="cursor-pointer peer-focus-within:ring-2 peer-focus-visible:ring-2"
					>
						<label htmlFor={fields.file.id}>
							<Icon name="file-text">Selecionar Arquivo de Quizzes</Icon>
						</label>
					</Button>
					{errors.length === 0 && quizzes.length > 0 ? (
						<>
							<StatusButton
								type="submit"
								disabled={isPending}
								variant="secondary"
								status={isPending ? 'pending' : 'idle'}
							>
								Enviar Arquivo
							</StatusButton>
						</>
					) : null}
				</div>

				<ErrorList errors={form.errors} />
			</Form>

			{errors.length > 0 ? (
				<ul>
					{errors.slice(0, 10).map((error, index) => (
						<li key={index} className="text-red-500">
							Linha {error.row} - {error.path} - {error.message}
						</li>
					))}
				</ul>
			) : quizzes.length > 0 ? (
				<div>
					Foram encontrados {quizzes.length} registros
					<ul>
						{quizzes.map((quiz, index) => (
							<li key={index} className="border-b border-black pb-5 ">
								<div>
									<span className="font-bold">Linha:</span>
									<span> {index + 1}</span>
								</div>
								<div>
									<span className="font-bold">Matéria:</span>
									<span> {quiz.materia}</span>
								</div>
								<div>
									<span className="font-bold">Lei:</span>
									<span> {quiz.lei}</span>
								</div>
								<div>
									<span className="font-bold">Titulo:</span>
									<span> {quiz.titulo}</span>
								</div>
								<div>
									<span className="font-bold">Capitulo:</span>
									<span> {quiz.capitulo}</span>
								</div>
								<div>
									<span className="font-bold">Artigo</span>
									<span> {quiz.artigo}</span>
								</div>

								<div>
									<span className="font-bold">Enunciado:</span>
									<span> {quiz.enunciado}</span>
								</div>
								<div>
									<span className="font-bold">Comentário:</span>
									<span> {quiz.comentario}</span>
								</div>
								<div>
									<span className="font-bold">fundamento:</span>
									<span> {quiz.fundamento}</span>
								</div>
								<div>
									<span className="font-bold">Gabarito</span>
									<span> {quiz.gabarito}</span>
								</div>
								<div>
									<span className="font-bold">tags/Campo Livre:</span>
									<span> {quiz.campo_livre}</span>
								</div>
								<div>
									<span className="font-bold">Ano</span>
									<span> {quiz.ano}</span>
								</div>
								<div>
									<span className="font-bold">Banca</span>
									<span> {quiz.banca}</span>
								</div>
								<div>
									<span className="font-bold">Cargo</span>
									<span> {quiz.cargo}</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</>
	)
}
