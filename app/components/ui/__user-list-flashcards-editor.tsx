import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form } from '@remix-run/react'
import { useState } from 'react'
import z from 'zod'
import { useIsPending } from '#app/utils/misc'
import { ErrorList, Field } from '../forms'
import { Icon } from './icon'
import { Label } from './label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './select'
import { StatusButton } from './status-button'

const cores = [
	{ name: 'Laranja vibrante', cor: '#FF5733' },
	{ name: 'Verde vibrante', cor: '#33FF57' },
	{ name: 'Azul vibrante', cor: '#3357FF' },
	{ name: 'Rosa brilhante', cor: '#FF33A1' },
	{ name: 'Dourado', cor: '#FFD700' },
	{ name: 'Roxo', cor: '#800080' },
	{ name: 'Verde-água', cor: '#20B2AA' },
	{ name: 'Laranja avermelhado', cor: '#FF4500' },
	{ name: 'Azul Dodger', cor: '#1E90FF' },
	{ name: 'Tomate (vermelho suave)', cor: '#FF6347' },
]

const icons = ['envelope-closed', 'heart', 'home', 'lei', 'laptop'] as const
export const schemaUserListFlashcard = z.object({
	id: z.string().optional(),
	name: z
		.string({ required_error: 'Preencha o nome' })
		.min(3, { message: 'Mínimo de 3 caracteres' })
		.max(50, { message: 'Máximo 50 caracteres' })
		.trim(),
	color: z
		.string()
		.default(cores[0].cor)
		.refine(
			value => {
				const cor = cores.find(c => c.cor === value)
				return !!cor
			},
			{ message: 'Cor inválida' },
		),
	icon: z.enum(icons, { message: 'Icone invalido' }).default(icons[0]),
})
type Props = {
	list?: {
		id: string
		name: string
		color?: string
		icon?: string
	}
}

export function UserListFlashcardsEditor({ list }: Props) {
	const [color, setColor] = useState(list?.color || cores[0].cor)
	const isPending = useIsPending()
	// const actionData = useActionData<typeof userListFlashcardAction>()
	const [form, fields] = useForm({
		id: `user-list-flashcard-editor-${list?.id}`,
		constraint: getZodConstraint(schemaUserListFlashcard),
		// lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: schemaUserListFlashcard })
		},
		defaultValue: {
			name: list?.name,
			color: list?.color,
			icon: list?.icon,
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Form className="space-y-3" method="post" {...getFormProps(form)}>
			{list?.id ? (
				<input type="hidden" hidden name="id" value={list.id} readOnly />
			) : null}
			<input
				type="text"
				hidden
				name="intent"
				value="user-list-editor"
				readOnly
			/>
			<Field
				labelProps={{ children: 'Nome' }}
				errors={fields.name.errors}
				inputProps={{
					...getInputProps(fields.name, { type: 'text' }),
				}}
			/>
			<div>
				<Label>Cor</Label>
				<Select
					onValueChange={value => setColor(value)}
					{...getInputProps(fields.color, { type: 'text' })}
				>
					<SelectTrigger>
						<SelectValue placeholder="Cor" />
					</SelectTrigger>
					<SelectContent>
						{cores.map(cor => (
							<SelectItem key={cor.cor} value={cor.cor}>
								<div className="flex items-center space-x-2">
									<div
										className="h-8 w-8 rounded-full"
										style={{ backgroundColor: cor.cor }}
									/>
									<span className="font-bold" style={{ color: cor.cor }}>
										{cor.name}
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<ErrorList errors={fields.color.errors} />
			</div>

			<div>
				<Label>Icone</Label>
				<Select {...getInputProps(fields.icon, { type: 'text' })}>
					<SelectTrigger className="w-min">
						<SelectValue placeholder="Icone" />
					</SelectTrigger>
					<SelectContent>
						{icons.map(icon => (
							<SelectItem key={icon} value={icon}>
								<div className="flex items-center space-x-2">
									<div
										className="flex h-8 w-8 items-center justify-center rounded-full"
										style={{ backgroundColor: color }}
									>
										<Icon name={icon} className="h-5 w-5 text-white" />
									</div>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<ErrorList errors={fields.icon.errors} />
			</div>
			<ErrorList errors={form.errors} />
			<StatusButton
				form={form.id}
				type="submit"
				disabled={isPending}
				status={isPending ? 'pending' : 'idle'}
			>
				{list?.id ? 'Salvar' : 'Criar'}
			</StatusButton>
		</Form>
	)
}
