import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { type Quiz } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Form, useSubmit } from '@remix-run/react'
import { type ChangeEvent } from 'react'
import { ClientOnly } from 'remix-utils/client-only'
import { z } from 'zod'
import { Field, CheckboxField, ErrorList } from '#app/components/forms.js'
import { RichText } from '#app/components/rich-text.client.js'
import { StatusButton } from '#app/components/ui/status-button.js'
import { useIsPending } from '#app/utils/misc.js'
export const quizSchemaEditor = z.object({
	id: z.string().optional(),
	artigoId: z.string({ required_error: 'Obrigatório' }).min(2),
	cargoId: z.string().optional(),
	bancaId: z.string().optional(),
	ano: z.coerce
		.number()
		.int()
		.gte(2000)
		.lte(new Date().getFullYear())
		.optional(),
	status: z.coerce.boolean().optional(),
	verdadeiro: z.coerce.boolean().optional(),
	enunciado: z
		.string({ required_error: 'Obrigatório', coerce: true })
		.min(10, { message: 'Mínimo 10 caracteres' }),
	comentario: z
		.string({ required_error: 'Obrigatório', coerce: true })
		.min(10, { message: 'Mínimo 10 caracteres' }),
	fundamento: z.string().optional(),
	tags: z.string().optional(),
})

export function QuizEditor({
	materias,
	leis,
	titulos,
	capitulos,
	artigos,
	bancas,
	cargos,
	quiz,
}: {
	materias: { id: string; name: string }[]
	leis: { id: string; name: string }[]
	titulos: { id: string; name: string }[]
	capitulos: { id: string; name: string }[]
	artigos: { id: string; name: string }[]
	bancas: { id: string; name: string }[]
	cargos: { id: string; name: string }[]
	quiz?: SerializeFrom<
		Omit<Quiz, 'createdAt' | 'updatedAt'> & {
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
		id: 'form-quiz-editor',
		shouldRevalidate: 'onBlur',
		shouldValidate: 'onSubmit',
		defaultValue: {
			ano: quiz?.ano,
			artigoId: quiz?.artigoId,
			bancaId: quiz?.bancaId,
			cargoId: quiz?.cargoId,
			comentario: quiz?.comentario,
			enunciado: quiz?.enunciado,
			fundamento: quiz?.fundamento,
			status: quiz?.status,
			tags: quiz?.tags,
			verdadeiro: quiz?.verdadeiro,
		},
		onValidate: ({ formData }) => {
			return parseWithZod(formData, { schema: quizSchemaEditor })
		},
	})
	return (
		<div>
			<Form className="flex flex-col space-y-1" replace={true}>
				<select
					name="materiaId"
					defaultValue={quiz?.materiaId}
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
					defaultValue={quiz?.leiId}
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
					defaultValue={quiz?.tituloId}
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
					defaultValue={quiz?.capituloId}
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
				{quiz ? (
					<input type="hidden" value={quiz.id} readOnly name="id" />
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
				<select
					{...getInputProps(fields.bancaId, { type: 'text' })}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
				>
					<option value={''}>Selecione um Banca(Opcional)</option>

					{bancas.map(banca => (
						<option key={banca.id} value={banca.id}>
							{banca.name}
						</option>
					))}
					{fields.bancaId.errors && (
						<div className="text-red-500">{fields.bancaId.errors}</div>
					)}
				</select>
				<select
					{...getInputProps(fields.cargoId, { type: 'text' })}
					className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
				>
					<option value={''}>Selecione um Cargo(Opcional)</option>

					{cargos.map(cargo => (
						<option key={cargo.id} value={cargo.id}>
							{cargo.name}
						</option>
					))}
					{fields.cargoId.errors && (
						<div className="text-red-500">{fields.cargoId.errors}</div>
					)}
				</select>

				<Field
					labelProps={{ children: 'tags/Campo Livre' }}
					inputProps={{ ...getInputProps(fields.tags, { type: 'text' }) }}
					errors={fields.tags.errors}
				/>
				<Field
					labelProps={{ children: 'Ano' }}
					inputProps={{
						...getInputProps(fields.ano, { type: 'number' }),
						min: 2000,
					}}
					errors={fields.ano.errors}
				/>
				<ClientOnly>
					{() => (
						<div>
							<RichText
								label="Enunciado"
								inputProps={{
									...getInputProps(fields.enunciado, { type: 'text' }),
								}}
								errors={fields.enunciado.errors}
							/>
							<RichText
								label="Comentario"
								inputProps={{
									...getInputProps(fields.comentario, { type: 'text' }),
								}}
								errors={fields.comentario.errors}
							/>
							<RichText
								label="Fundamnento"
								inputProps={{
									...getInputProps(fields.fundamento, { type: 'text' }),
								}}
								errors={fields.fundamento.errors}
							/>
						</div>
					)}
				</ClientOnly>
				<CheckboxField
					labelProps={{ children: 'status' }}
					buttonProps={{
						...getInputProps(fields.status, { type: 'checkbox' }),
					}}
				/>
				<CheckboxField
					labelProps={{ children: 'Verdadeiro' }}
					buttonProps={{
						...getInputProps(fields.verdadeiro, { type: 'checkbox' }),
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
						{quiz ? 'Atualizar' : 'Cadastrar'}
					</StatusButton>
				</div>
			</Form>
		</div>
	)
}
