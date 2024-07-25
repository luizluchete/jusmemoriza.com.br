import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { Field, TextareaField } from '#app/components/forms'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { prisma } from '#app/utils/db.server'
import { Button } from '#app/components/ui/button.js'

const productSchema = z.object({
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
	combos: z.array(z.string()).optional(),
})

export async function loader({ request }: LoaderFunctionArgs) {
	const combos = await prisma.combo.findMany({
		select: { id: true, name: true },
	})
	return json({ combos })
}

export async function action({ request }: ActionFunctionArgs) {
	return json({})
}

export default function New() {
	const { combos } = useLoaderData<typeof loader>()
	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: productSchema })
		},
	})
	const combosForm = fields.combos.getFieldList()

	return (
		<Form method="post" {...getFormProps(form)}>
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
				inputProps={{ ...getInputProps(fields.hotmartLink, { type: 'text' }) }}
				labelProps={{ children: 'URL de Venda HOTMART' }}
				errors={fields.hotmartLink.errors}
			/>

			<Field
				inputProps={{ ...getInputProps(fields.hotmartId, { type: 'number' }) }}
				labelProps={{ children: 'ID do produto na HOTMART' }}
				errors={fields.hotmartId.errors}
			/>

			<div className="mt-5">
				<hr className="my-5" />
				<h4>Vincular Combos</h4>
				<div className="flex items-center space-x-3">
					<Select>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Selecionar combos" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Combos</SelectLabel>
								{combos.map(combo => (
									<SelectItem key={combo.id} value={combo.id}>
										{combo.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Button
						{...form.insert.getButtonProps({
							name: fields.combos.name,
							defaultValue: 'teste',
						})}
					>
						ADD
					</Button>
				</div>
				<ul>
					{combosForm.map(combo => {
						console.log({ combo })

						return <li key={combo.id}>{combo.value}</li>
					})}
				</ul>
			</div>
		</Form>
	)
}
