import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Cargo } from '@prisma/client'
import { useNavigate, useActionData, Form } from '@remix-run/react'
import { z } from 'zod'
import { Field } from '#app/components/forms.js'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '#app/components/ui/dialog.js'
import { StatusButton } from '#app/components/ui/status-button.js'
import { useIsPending } from '#app/utils/misc.js'
import { type action } from './__cargo-editor.server'
export const cargoSchemaEditor = z.object({
	id: z.string().optional(),
	nome: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }).trim(),
	status: z.coerce.boolean().optional(),
})

export function CargoEditor({
	cargo,
}: {
	cargo?: Pick<Cargo, 'id' | 'name' | 'status'>
}) {
	const navigate = useNavigate()
	const back = () => navigate('..', { replace: true })
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'form-cargoEditor',
		constraint: getZodConstraint(cargoSchemaEditor),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: cargoSchemaEditor })
		},
		defaultValue: {
			id: cargo?.id,
			nome: cargo?.name,
			status: cargo?.status,
		},

		shouldRevalidate: 'onBlur',
	})

	return (
		<Dialog defaultOpen={true} onOpenChange={open => (!open ? back() : null)}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{cargo ? 'Editar' : 'Cadastro de Cargo'}</DialogTitle>
					<DialogDescription>
						Faça {cargo ? 'a edição do' : 'o cadastro de'} cargo aqui. Clique em
						salvar quando terminar.
					</DialogDescription>
				</DialogHeader>
				<Form {...getFormProps(form)} method="POST">
					{cargo ? (
						<input type="hidden" value={cargo.id} readOnly name="id" />
					) : null}
					<div className="grid gap-1 py-4">
						<Field
							className="col-span-3"
							labelProps={{ children: 'Nome' }}
							inputProps={{
								autoFocus: true,
								...getInputProps(fields.nome, { type: 'text' }),
							}}
							errors={fields.nome.errors}
						/>

						<Field
							labelProps={{ children: 'Status' }}
							inputProps={{
								className: 'h-5 w-5',
								...getInputProps(fields.status, { type: 'checkbox' }),
							}}
							errors={fields.status.errors}
						/>
					</div>
					<DialogFooter>
						<StatusButton
							form={form.id}
							type="submit"
							disabled={isPending}
							status={isPending ? 'pending' : 'idle'}
						>
							Salvar
						</StatusButton>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
