import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Lei } from '@prisma/client'
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
import { materiaSchemaEditor } from '../__materia-editor'
import { type action } from '../__materia-editor.server'
export const leiSchemaEditor = z.object({
	id: z.string().optional(),
	nome: z
		.string({ required_error: 'Obrigatório' })
		.min(3, { message: 'Mínimo 3 caracteres' }).trim(),
	status: z.coerce.boolean().optional(),
})

export function LeiEditor({
	lei,
}: {
	lei?: Pick<Lei, 'id' | 'name' | 'status'>
}) {
	const navigate = useNavigate()
	const back = () => navigate('..', { replace: true })
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'form-leiEditor',
		constraint: getZodConstraint(materiaSchemaEditor),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: materiaSchemaEditor })
		},
		defaultValue: {
			id: lei?.id,
			nome: lei?.name,
			status: lei?.status,
		},

		shouldRevalidate: 'onBlur',
	})

	return (
		<Dialog defaultOpen={true} onOpenChange={open => (!open ? back() : null)}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{lei ? 'Editar' : 'Cadastro de Lei'}</DialogTitle>
					<DialogDescription>
						Faça {lei ? 'a edição da' : 'o cadastro de'} lei aqui. Clique em
						salvar quando terminar.
					</DialogDescription>
				</DialogHeader>
				<Form {...getFormProps(form)} method="POST">
					{lei ? (
						<input type="hidden" value={lei.id} readOnly name="id" />
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
