import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type ActionFunctionArgs,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'
import { useActionData, Form, json } from '@remix-run/react'
import Papa from 'papaparse'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { prisma } from '#app/utils/db.server.js'
import { getErrorMessage, useIsPending } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server.js'

const MAX_SIZE = 1024 * 1024 * 10 // 10MB
const csvRowFlashcard = z.object({
	materia: z.string().trim().min(1),
	lei: z.string().trim().min(1),
	titulo: z.string().trim().optional(),
	capitulo: z.string().trim().optional(),
	artigo: z.string().trim().optional(),
	frente: z.string().trim().min(1),
	verso: z.string().trim().min(1),
	fundamento: z.string().trim().optional(),
	tipo: z.enum(['lei', 'jurisprudencia', 'doutrina', '']).optional(),
	dificuldade: z.enum(['facil', 'media', 'dificil', '']).optional(),
})
const arrayFlashcards = z.array(csvRowFlashcard)
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
	const result = arrayFlashcards.safeParse(data)
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
		const flashcardWithMateria = await Promise.all(
			result.data.map(async (flashcard, index) => {
				const materia = await prisma.materia.findFirst({
					select: { id: true },
					where: { name: { equals: flashcard.materia, mode: 'insensitive' } },
				})
				if (!materia) {
					error = `linha ${index} Materia ${flashcard.materia} não cadastrada`
					throw new Error(error)
				}
				return { ...flashcard, materiaId: materia.id }
			}),
		)

		// validar se todas as leis existem
		const flashcardWithLei = await Promise.all(
			flashcardWithMateria.map(async flashcard => {
				const lei = await prisma.lei.findFirst({
					select: { id: true },
					where: {
						name: { equals: flashcard.lei, mode: 'insensitive' },
						materiaId: flashcard.materiaId,
					},
				})
				if (!lei) {
					error = `Lei ${flashcard.lei} na materia ${flashcard.materia} não cadastrada`
					throw new Error(error)
				}
				return { ...flashcard, leiId: lei.id }
			}),
		)

		// validar se todos os titulos existem, se não existir criar e se for null criar um titulo com o nome da lei
		type typeFlashcardWithTitulo = (typeof flashcardWithLei)[number] & {
			tituloId: string
			titulo: string
		}
		const flashcardWithTitulo: typeFlashcardWithTitulo[] = []

		for (const flashcard of flashcardWithLei) {
			let tituloName = flashcard.titulo
			if (!tituloName) {
				tituloName = flashcard.lei
			}
			let tituloExists = await prisma.titulo.findFirst({
				select: { id: true },
				where: {
					name: { equals: tituloName, mode: 'insensitive' },
					leiId: flashcard.leiId,
				},
			})

			if (!tituloExists) {
				tituloExists = await prisma.titulo.create({
					data: {
						name: tituloName,
						leiId: flashcard.leiId,
					},
				})
			}
			flashcardWithTitulo.push({
				...flashcard,
				tituloId: tituloExists.id,
				titulo: tituloName,
			})
		}

		// validar se todos os capitulos existem, se não existir criar e se for null criar um capitulo com o nome do titulo
		const flashcardWithCapitulo: typeof flashcardWithTitulo &
			{ capituloId: string; capitulo: string }[] = []

		for (const flashcard of flashcardWithTitulo) {
			let capituloName = flashcard.capitulo
			if (!capituloName) {
				capituloName = flashcard.titulo
			}
			let capituloExists = await prisma.capitulo.findFirst({
				select: { id: true },
				where: {
					name: { equals: capituloName, mode: 'insensitive' },
					tituloId: flashcard.tituloId,
				},
			})

			if (!capituloExists) {
				capituloExists = await prisma.capitulo.create({
					data: {
						name: capituloName,
						tituloId: flashcard.tituloId,
					},
				})
			}
			flashcardWithCapitulo.push({
				...flashcard,
				capituloId: capituloExists.id,
				capitulo: capituloName,
			})
		}

		//valida se todos os artigos existem, se não existir criar e se for null criar um artigo com o nome do capitulo
		const finalFlashcards: Array<
			(typeof flashcardWithCapitulo)[number] & {
				artigoId: string
				artigo: string
			}
		> = []

		for (const flashcard of flashcardWithCapitulo) {
			let artigoName = flashcard.artigo
			if (!artigoName) {
				artigoName = flashcard.capitulo
			}
			let artigoExists = await prisma.artigo.findFirst({
				select: { id: true },
				where: {
					name: { equals: artigoName, mode: 'insensitive' },
					capituloId: flashcard.capituloId,
				},
			})

			if (!artigoExists) {
				artigoExists = await prisma.artigo.create({
					data: {
						name: artigoName,
						capituloId: flashcard.capituloId,
					},
				})
			}
			finalFlashcards.push({
				...flashcard,
				artigoId: artigoExists.id,
				artigo: artigoName,
			})
		}

		// GRAVANDO OS QUIZZES NO BANCO DE DADOS
		await prisma.$transaction(
			finalFlashcards.map(flashcard =>
				prisma.flashcard.create({
					data: {
						frente: flashcard.frente,
						verso: flashcard.verso,
						fundamento: flashcard.fundamento,
						tipo: flashcard.tipo,
						dificuldade: flashcard.dificuldade,
						artigoId: flashcard.artigoId,
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
				description: 'FLASHCARDS importados com sucesso',
				type: 'success',
			}),
		},
	)
}

export default function Layout() {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'import-flashcards',
		constraint: getZodConstraint(fileSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: fileSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const [loadingRead, setLoadingRead] = useState(false)
	const [flashcards, setFlashcards] = useState<
		z.infer<typeof csvRowFlashcard>[]
	>([])

	const [errors, setErrors] = useState<
		{ row: number; path: string; message: string }[]
	>([])

	const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFlashcards([])
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
							const result = csvRowFlashcard.safeParse(value.data)
							if (!result.success) {
								const errorDetails = result.error.errors.map(error => ({
									row: line,
									path: error.path.join('.'),
									message: error.message,
								}))
								setErrors(errors => [...errors, ...errorDetails])
								return
							}
							setFlashcards(flashcards => [...flashcards, result.data])
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
			setFlashcards([])
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
							<Icon name="file-text">Selecionar Arquivo de Flashcards</Icon>
						</label>
					</Button>
					{errors.length === 0 && flashcards.length > 0 ? (
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
			) : flashcards.length > 0 ? (
				<div>
					Foram encontrados {flashcards.length} registros
					<ul>
						{flashcards.map((flashcard, index) => (
							<li key={index} className="border-b border-black pb-5 ">
								<div>
									<span className="font-bold">Linha:</span>
									<span> {index + 1}</span>
								</div>
								<div>
									<span className="font-bold">Matéria:</span>
									<span> {flashcard.materia}</span>
								</div>
								<div>
									<span className="font-bold">Lei:</span>
									<span> {flashcard.lei}</span>
								</div>
								<div>
									<span className="font-bold">Titulo:</span>
									<span> {flashcard.titulo}</span>
								</div>
								<div>
									<span className="font-bold">Capitulo:</span>
									<span> {flashcard.capitulo}</span>
								</div>
								<div>
									<span className="font-bold">Artigo</span>
									<span> {flashcard.artigo}</span>
								</div>

								<div>
									<span className="font-bold">Título:</span>
									<span> {flashcard.titulo}</span>
								</div>
								<div>
									<span className="font-bold">Frente:</span>
									<span> {flashcard.frente}</span>
								</div>
								<div>
									<span className="font-bold">Verso:</span>
									<span> {flashcard.verso}</span>
								</div>
								<div>
									<span className="font-bold">Fundamento:</span>
									<span> {flashcard.fundamento}</span>
								</div>
								<div>
									<span className="font-bold">Tipo:</span>
									<span> {flashcard.tipo}</span>
								</div>
								<div>
									<span className="font-bold">Dificuldade:</span>
									<span> {flashcard.dificuldade}</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</>
	)
}
