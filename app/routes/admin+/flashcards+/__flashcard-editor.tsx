import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { type Flashcard } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Form, useSubmit } from '@remix-run/react'
import { type ChangeEvent } from 'react'
import { ClientOnly } from 'remix-utils/client-only'
import { z } from 'zod'
import { CheckboxField, ErrorList, Field } from '#app/components/forms'
import { RichText } from '#app/components/rich-text.client'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { StatusButton } from '#app/components/ui/status-button'
import { useIsPending } from '#app/utils/misc'

export const flashcardSchemaEditor = z.object({
	id: z.string().optional(),
	artigoId: z.string({ required_error: 'Obrigatório' }).min(2),
	titulo: z.string().optional(),
	frente: z
		.string({ required_error: 'Obrigatório', coerce: true })
		.min(10, { message: 'Mínimo 10 caracteres' }),
	verso: z
		.string({ required_error: 'Obrigatório', coerce: true })
		.min(10, { message: 'Mínimo 10 caracteres' }),
	fundamento: z.string().optional(),
	status: z.coerce.boolean().optional(),
	tipo: z.enum(['jurisprudencia', 'doutrina', 'lei']).optional(),
	dificuldade: z.enum(['facil', 'media', 'dificil']).optional(),
})

export function FlashcardEditor({
	materias,
	leis,
	titulos,
	capitulos,
	artigos,
	flashcard,
}: {
	materias: { id: string; name: string }[]
	leis: { id: string; name: string }[]
	titulos: { id: string; name: string }[]
	capitulos: { id: string; name: string }[]
	artigos: { id: string; name: string }[]
	flashcard?: SerializeFrom<
		Omit<Flashcard, 'createdAt' | 'updatedAt'> & {
			materiaId: string
			leiId: string
			tituloId: string
			capituloId: string
		}
	>
}) {
	const submit = useSubmit()

	const isPending = useIsPending()
	const searchFormSubmit = (e: ChangeEvent<HTMLSelectElement>) =>
		submit(e.currentTarget.form, { replace: true })

	const [form, fields] = useForm({
		id: 'form-flashcard-editor',
		shouldRevalidate: 'onBlur',
		shouldValidate: 'onSubmit',
		defaultValue: {
			artigoId: flashcard?.artigoId,
			frente: flashcard?.frente,
			verso: flashcard?.verso,
			fundamento: flashcard?.fundamento,
			status: flashcard?.status,
			tipo: flashcard?.tipo,
			dificuldade: flashcard?.dificuldade,
			titulo: flashcard?.titulo,
		},
		onValidate: ({ formData }) => {
			return parseWithZod(formData, { schema: flashcardSchemaEditor })
		},
	})

	return (
		<div>
			<Form className="flex flex-col space-y-1" replace={true}>
				<select
					name="materiaId"
					defaultValue={flashcard?.materiaId}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					onChange={e => searchFormSubmit(e)}
				>
					<option value="">Selecione uma Matéria</option>
					{materias.map(materia => (
						<option key={materia.id} value={materia.id}>
							{materia.name}
						</option>
					))}
				</select>

				<select
					name="leiId"
					defaultValue={flashcard?.leiId}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					onChange={e => searchFormSubmit(e)}
				>
					<option value={''}>Selecione uma Lei</option>

					{leis.map(lei => (
						<option key={lei.id} value={lei.id}>
							{lei.name}
						</option>
					))}
				</select>
				<select
					name="tituloId"
					defaultValue={flashcard?.tituloId}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					onChange={e => searchFormSubmit(e)}
				>
					<option value={''}>Selecione um Título</option>

					{titulos.map(titulo => (
						<option key={titulo.id} value={titulo.id}>
							{titulo.name}
						</option>
					))}
				</select>
				<select
					name="capituloId"
					defaultValue={flashcard?.capituloId}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					onChange={e => searchFormSubmit(e)}
				>
					<option value={''}>Selecione um Capitulo</option>

					{capitulos.map(capitulo => (
						<option key={capitulo.id} value={capitulo.id}>
							{capitulo.name}
						</option>
					))}
				</select>
			</Form>
			<Form method="post" {...getFormProps(form)} className="space-y-1">
				{flashcard ? (
					<input type="hidden" value={flashcard.id} readOnly name="id" />
				) : null}
				<select
					{...getInputProps(fields.artigoId, { type: 'text' })}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
				>
					<option value={''}>Selecione um Artigo</option>

					{artigos.map(artigo => (
						<option key={artigo.id} value={artigo.id}>
							{artigo.name}
						</option>
					))}
					{fields.artigoId.errors && (
						<div className="text-red-500">{fields.artigoId.errors}</div>
					)}
				</select>

				<Field
					labelProps={{ children: 'Título do Flashcard(Opcional)' }}
					inputProps={{ ...getInputProps(fields.titulo, { type: 'text' }) }}
					errors={fields.titulo.errors}
				/>
				<ClientOnly>
					{() => (
						<div>
							<RichText
								label="Frente do Flashcard"
								inputProps={{
									...getInputProps(fields.frente, { type: 'text' }),
								}}
								errors={fields.frente.errors}
							/>
							<RichText
								label="Verso do Flashcard"
								inputProps={{
									...getInputProps(fields.verso, { type: 'text' }),
								}}
								errors={fields.verso.errors}
							/>
							<RichText
								label="Fundamento do Flashcard(Opcional)"
								inputProps={{
									...getInputProps(fields.fundamento, { type: 'text' }),
								}}
								errors={fields.fundamento.errors}
							/>
						</div>
					)}
				</ClientOnly>

				<Select {...getInputProps(fields.dificuldade, { type: 'text' })}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Dificuldade" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="facil">Fácil</SelectItem>
						<SelectItem value="media">Média</SelectItem>
						<SelectItem value="dificil">Difícil</SelectItem>
					</SelectContent>
				</Select>
				<Select {...getInputProps(fields.tipo, { type: 'text' })}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="facil">Lei</SelectItem>
						<SelectItem value="jurisprudencia">Jurisprudência</SelectItem>
						<SelectItem value="doutrina">Doutrina</SelectItem>
					</SelectContent>
				</Select>
				<CheckboxField
					labelProps={{ children: 'status' }}
					buttonProps={{
						defaultChecked: true,
						...getInputProps(fields.status, { type: 'checkbox' }),
					}}
				/>

				<ErrorList errors={form.errors} id={form.errorId} />
				<div className="flex w-min justify-end">
					<StatusButton
						className="w-min"
						status={isPending ? 'pending' : form.status ?? 'idle'}
						type="submit"
						disabled={isPending}
					>
						{flashcard ? 'Atualizar' : 'Cadastrar'}
					</StatusButton>
				</div>
			</Form>
		</div>
	)
}
