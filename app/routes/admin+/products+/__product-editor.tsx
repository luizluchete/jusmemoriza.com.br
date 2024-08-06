import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'

import { type Product } from '@prisma/client'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { ErrorList, Field, TextareaField } from '#app/components/forms'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { StatusButton } from '#app/components/ui/status-button'
import { useIsPending } from '#app/utils/misc'
import { type action } from './__product-editor.server'

export const productSchema = z.object({
	id: z.string().optional(),
	name: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' })
		.trim(),
	description: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' })
		.trim(),
	hotmartId: z.number().int().optional(),
	hotmartLink: z.string().url().optional(),
})

export function ProductEditor({
	product,
	combos,
}: {
	combos?: { id: string; name: string }[]
	product?: Pick<
		Product,
		'id' | 'description' | 'hotmartLink' | 'name' | 'productIdHotmart'
	>
}) {
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		lastResult: actionData?.result,
		defaultValue: {
			description: product?.description,
			hotmartLink: product?.hotmartLink,
			id: product?.id,
			name: product?.name,
			hotmartId: product?.productIdHotmart,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: productSchema })
		},
	})

	const isPending = useIsPending()

	return (
		<>
			<Form method="post" {...getFormProps(form)}>
				{product ? (
					<input name="id" value={product.id} hidden type="hidden" readOnly />
				) : null}
				<Field
					inputProps={{ ...getInputProps(fields.name, { type: 'text' }) }}
					labelProps={{ children: 'Nome' }}
					errors={fields.name.errors}
				/>

				<TextareaField
					textareaProps={{
						...getInputProps(fields.description, { type: 'text' }),
					}}
					labelProps={{ children: 'Descrição' }}
					errors={fields.description.errors}
				/>

				<Field
					inputProps={{
						...getInputProps(fields.hotmartLink, { type: 'text' }),
					}}
					labelProps={{ children: 'URL de Venda HOTMART' }}
					errors={fields.hotmartLink.errors}
				/>

				<Field
					inputProps={{
						...getInputProps(fields.hotmartId, { type: 'number' }),
					}}
					labelProps={{ children: 'ID do produto na HOTMART' }}
					errors={fields.hotmartId.errors}
				/>

				<ErrorList errors={form.errors} />

				<div className="mt-5 flex w-full justify-end">
					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						Salvar
					</StatusButton>
				</div>
			</Form>
			<InputCombos />
		</>
	)
}

function InputCombos() {
	return (
		<div>
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Select a verified email to display" />
				</SelectTrigger>

				<SelectContent>
					<SelectItem value="m@example.com">m@example.com</SelectItem>
					<SelectItem value="m@google.com">m@google.com</SelectItem>
					<SelectItem value="m@support.com">m@support.com</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
