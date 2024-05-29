import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Materia } from '@prisma/client'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { Field } from '#app/components/forms'
import { StatusButton } from '#app/components/ui/status-button'
import { useIsPending } from '#app/utils/misc'
import { type action } from './__materia-editor.server'

export const materiaSchemaEditor = z.object({
	id: z.string().optional(),
	nome: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }),
	status: z.coerce.boolean().optional(),
	cor: z.string().optional(),
})

export function MateriaEditor({
	materia,
}: {
	materia?: Pick<Materia, 'name' | 'color' | 'status' | 'id'>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: 'criarMateria-form',
		constraint: getZodConstraint(materiaSchemaEditor),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: materiaSchemaEditor })
		},
		defaultValue: {
			...materia,
			nome: materia?.name,
			cor: materia?.color,
		},
		shouldRevalidate: 'onBlur',
	})
	return (
		<Form
			{...getFormProps(form)}
			method="POST"
			className="flex w-full flex-col justify-start"
		>
			{materia ? (
				<input type="hidden" name="id" value={materia.id} readOnly />
			) : null}
			<Field
				labelProps={{ children: 'Nome' }}
				inputProps={{
					autoFocus: true,
					...getInputProps(fields.nome, { type: 'text' }),
				}}
				errors={fields.nome.errors}
			/>
			<Field
				labelProps={{ children: 'Cor' }}
				inputProps={{
					className: 'h-10 w-10 p-0',
					...getInputProps(fields.cor, { type: 'color' }),
				}}
				errors={fields.cor.errors}
			/>
			<Field
				labelProps={{ children: 'Status' }}
				inputProps={{
					className: 'h-5 w-5',
					...getInputProps(fields.status, { type: 'checkbox' }),
				}}
				errors={fields.status.errors}
			/>

			<div className="flex w-full justify-end">
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
				>
					{materia ? 'Atualizar' : 'Criar'}
				</StatusButton>
			</div>
		</Form>
	)
}
