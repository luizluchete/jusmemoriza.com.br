import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import {
	useActionData,
	useNavigate,
	useSearchParams,
	Form,
} from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { ErrorList, TextareaField } from '#app/components/forms'
import {
	DialogContent,
	DialogHeader,
	DialogFooter,
	Dialog,
	DialogDescription,
	DialogTitle,
} from '#app/components/ui/dialog'
import { Label } from '#app/components/ui/label'
import { MultiCombobox } from '#app/components/ui/multi-combobox'
import {
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	Select,
} from '#app/components/ui/select'
import { StatusButton } from '#app/components/ui/status-button'
import { useIsPending } from '#app/utils/misc'
import { type action } from './__mycards-editor.server'

export const schemaMyFlashcard = z.object({
	id: z.string().optional(),
	leiId: z.string({ required_error: 'Obrigatório' }).min(2),
	frente: z
		.string({ required_error: 'Obrigatório', coerce: true })
		.min(10, { message: 'Mínimo 10 caracteres' }),
	verso: z
		.string({ required_error: 'Obrigatório', coerce: true })
		.min(10, { message: 'Mínimo 10 caracteres' }),
	lists: z.array(z.string()).optional(),
})

type MyCardsEditorProps = {
	materias: { id: string; name: string }[]
	leis: { id: string; name: string }[]
	lists: { id: string; name: string }[]
	flashcard?: {
		id: string
		lei: { id: string; name: string; materia: { id: string; name: string } }
		frente: string
		verso: string
		lists: { id: string; name: string }[]
	}
}
export function MyCardsEditor({
	leis,
	lists,
	materias,
	flashcard,
}: MyCardsEditorProps) {
	const actionData = useActionData<typeof action>()
	const navigate = useNavigate()
	const back = () => navigate('..')
	const [, setSearchParams] = useSearchParams()
	const isPending = useIsPending()

	const [myListsSelected, setMyListsSelected] = useState<
		{ id: string; label: string }[]
	>(flashcard?.lists.map(l => ({ id: l.id, label: l.name })) || [])

	const [form, fields] = useForm({
		id: 'form-my-flashcards',
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: schemaMyFlashcard })
		},
		defaultValue: {
			frente: flashcard?.frente,
			verso: flashcard?.verso,
			leiId: flashcard?.lei.id,
		},
		shouldRevalidate: 'onBlur',
		lastResult: actionData?.result,
	})
	return (
		<Dialog defaultOpen onOpenChange={back}>
			<DialogContent className="max-h-screen overflow-auto sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Criar Flashcard</DialogTitle>
					<DialogDescription>
						Aqui você pode criar seus próprios flashcards
					</DialogDescription>
				</DialogHeader>
				<Form method="post" {...getFormProps(form)}>
					{flashcard ? (
						<input
							type="hidden"
							hidden
							value={flashcard.id}
							name="id"
							readOnly
						/>
					) : null}
					<div className="grid gap-4 py-4">
						<div className="flex flex-col space-y-1">
							<Label htmlFor="materia" className="text-left">
								Matéria
							</Label>
							<Select
								name="materiaId"
								defaultValue={flashcard?.lei.materia.id}
								onValueChange={e =>
									setSearchParams(prev => {
										prev.set('materiaId', e)
										return prev
									})
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Matéria" />
								</SelectTrigger>
								<SelectContent className="max-w-80">
									{materias.map(({ id, name }) => (
										<SelectItem key={id} value={id}>
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col space-y-1">
							<Label htmlFor="lei" className="text-left">
								Lei
							</Label>
							<Select {...getInputProps(fields.leiId, { type: 'text' })}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Lei" />
								</SelectTrigger>
								<SelectContent className="w-full max-w-sm">
									{leis.map(({ id, name }) => (
										<SelectItem key={id} value={id} className="text-wrap">
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<ErrorList
								errors={fields.leiId.errors}
								id={fields.leiId.errorId}
							/>
						</div>

						<TextareaField
							labelProps={{ children: 'Frente' }}
							textareaProps={{
								...getInputProps(fields.frente, { type: 'text' }),
							}}
							errors={fields.frente.errors}
						/>

						<TextareaField
							labelProps={{ children: 'Verso' }}
							textareaProps={{
								...getInputProps(fields.verso, { type: 'text' }),
							}}
							errors={fields.verso.errors}
						/>
						<MultiCombobox
							side="top"
							name="lists"
							placeholder="Minhas Listas"
							options={lists.map(({ id, name }) => ({ id, label: name }))}
							selectedValues={myListsSelected}
							setSelectedValues={setMyListsSelected}
						/>
					</div>
					<DialogFooter>
						<StatusButton
							form={form.id}
							type="submit"
							disabled={isPending}
							status={isPending ? 'pending' : 'idle'}
						>
							{flashcard ? 'Salvar' : 'Criar'} flashcard
						</StatusButton>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
