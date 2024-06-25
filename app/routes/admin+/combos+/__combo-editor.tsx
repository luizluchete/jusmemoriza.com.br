import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Combo } from '@prisma/client'
import { useActionData, Form, Link } from '@remix-run/react'
import { z } from 'zod'
import { Field, TextareaField } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { StatusButton } from '#app/components/ui/status-button'
import { getComboImgSrc, useIsPending } from '#app/utils/misc'
import { type action } from './new'

export const comboEditorSchema = z.object({
	id: z.string().optional(),
	intent: z.literal('submit'),
	nome: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }),
	urlHotmart: z.string().url().optional(),
	color: z.string().optional(),
	description: z.string().optional(),
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
	combo?: Pick<
		Combo,
		'id' | 'name' | 'status' | 'urlHotmart' | 'color' | 'description'
	> & { imageId?: string }
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
			color: combo?.color,
			description: combo?.description,
			status: combo?.status,
		},
		shouldRevalidate: 'onBlur',
	})
	return (
		<>
			{combo ? (
				<>
					<div
						className="flex h-24 w-24 items-center justify-center rounded-full p-4"
						style={{ backgroundColor: combo.color ?? 'gray' }}
					>
						<img
							src={getComboImgSrc(combo.imageId)}
							className="h-full w-full rounded-full object-cover"
							alt={combo.name}
						/>
					</div>
					<Link to="image">
						<Button className="mt-1">Alterar Imagem</Button>
					</Link>
				</>
			) : null}
			<Form
				{...getFormProps(form)}
				className="space-y-2"
				method="post"
				encType="multipart/form-data"
			>
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
				<TextareaField
					labelProps={{ children: 'Descrição' }}
					textareaProps={{
						...getInputProps(fields.description, { type: 'text' }),
					}}
					errors={fields.description.errors}
				/>
				<div className="w-30 flex">
					<Field
						labelProps={{ children: 'Cor do Combo' }}
						inputProps={{
							...getInputProps(fields.color, { type: 'color' }),
						}}
						errors={fields.color.errors}
					/>
				</div>
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
		</>
	)
}
