import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Combo } from '@prisma/client'
import { useActionData, Form } from '@remix-run/react'
import { z } from 'zod'
import { Field } from '#app/components/forms.js'
import { StatusButton } from '#app/components/ui/status-button.js'
import { useIsPending } from '#app/utils/misc.js'
import { type action } from './new'

export const comboEditorSchema = z.object({
	id: z.string().optional(),
	intent: z.literal('submit'),
	nome: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }),
	urlHotmart: z.string().url().optional(),
	status: z.coerce.boolean().optional(),
})
export const deleteLei = z.object({
	intent: z.literal('delete'),
	leiId: z.string(),
})
export const addLei = z.object({
	intent: z.literal('add'),
	leiId: z.string(),
})
export const ComboFormSchema = z.discriminatedUnion('intent', [
	deleteLei,
	addLei,
	comboEditorSchema,
])
export function ComboEditor({
	combo,
}: {
	combo?: Pick<Combo, 'id' | 'name' | 'status' | 'urlHotmart'>
}) {
	const isPending = useIsPending()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'combo-editor-form',
		constraint: getZodConstraint(comboEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: comboEditorSchema })
		},
		defaultValue: {
			nome: combo?.name,
			urlHotmart: combo?.urlHotmart,
			status: combo?.status,
		},
		shouldRevalidate: 'onBlur',
	})
	return (
		<Form {...getFormProps(form)} className="space-y-2" method="post">
			{combo ? (
				<input type="hidden" value={combo.id} readOnly name="id" />
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
				labelProps={{ children: 'URL Oferta hotmart' }}
				inputProps={{
					...getInputProps(fields.urlHotmart, { type: 'text' }),
				}}
				errors={fields.urlHotmart.errors}
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
					name="intent"
					value="submit"
					form={form.id}
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
				>
					Salvar
				</StatusButton>
			</div>
		</Form>
	)
}
