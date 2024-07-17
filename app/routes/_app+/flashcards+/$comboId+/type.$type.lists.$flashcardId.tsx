import { getFormProps, useForm, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	useNavigate,
	useParams,
} from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useIsPending } from '#app/utils/misc'

const schemaCreateList = z.object({
	intent: z.literal('createList'),
	name: z
		.string({ required_error: 'Preencha o nome' })
		.min(3, { message: 'Mínimo de 3 caracteres' })
		.max(50, { message: 'Máximo 50 caracteres' })
		.trim(),
	redirectTo: z.string().optional(),
})

const schemaFlashcardOnList = z.object({
	intent: z.literal('flashcardOnList'),
	listId: z.string(),
	add: z.coerce.boolean(),
})

const schemaUsersListsFlashcard = z.discriminatedUnion('intent', [
	schemaCreateList,
	schemaFlashcardOnList,
])

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const flashcardId = params.flashcardId
	invariantResponse(flashcardId, 'flashcardId is required', { status: 404 })

	const submission = await parseWithZod(formData, {
		schema: schemaUsersListsFlashcard.superRefine(async (data, ctx) => {
			if (data.intent === 'createList') {
				const existingList = await prisma.listsUser.findFirst({
					where: { name: { equals: data.name, mode: 'insensitive' }, userId },
				})
				if (existingList) {
					ctx.addIssue({
						path: ['name'],
						code: z.ZodIssueCode.custom,
						message: 'Você já tem uma lista com esse nome.',
					})
				}
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}

	const { intent } = submission.value
	if (intent === 'createList') {
		const { name } = submission.value
		await prisma.listsUser.create({ data: { name, userId } })
		return json({ result: submission.reply() })
	}

	if (intent === 'flashcardOnList') {
		const { add, listId } = submission.value
		const exists = await prisma.listsUsersFlashcards.findFirst({
			where: { flashcardId, listId },
		})
		if (!exists && add) {
			await prisma.listsUsersFlashcards.create({
				data: { flashcardId, listId },
			})
			return json({ result: submission.reply() })
		}
		if (exists && !add) {
			await prisma.listsUsersFlashcards.delete({
				where: { id: exists.id },
			})
			return json({ result: submission.reply() })
		}
	}

	return json(null)
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const lists = await prisma.listsUser.findMany({
		select: {
			id: true,
			name: true,
			flashcards: {
				select: { flashcardId: true },
			},
		},
		where: { userId },
		orderBy: { name: 'asc' },
	})
	return json({ lists })
}

export default function FlashcardIdLists() {
	const navigate = useNavigate()
	const back = () => navigate(-1)
	const { lists } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'create-list-user',
		constraint: getZodConstraint(schemaCreateList),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: schemaCreateList })
		},
		shouldRevalidate: 'onBlur',
	})
	const flashcardId = useParams().flashcardId
	const [openCreateList, setOpenCreateList] = useState(false)
	const submittinNewList =
		actionData?.result?.initialValue?.intent === 'createList' &&
		actionData.result.status === 'success'
	useEffect(() => {
		if (submittinNewList) {
			setOpenCreateList(false)
		}
	}, [submittinNewList])
	return (
		<Dialog defaultOpen={true} onOpenChange={back}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Listas personalizadas</DialogTitle>
					<DialogDescription>
						<span>
							Crie listas personalizadas para agrupar os flashcards que deseja
							revisar posteriormente.
						</span>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<hr />
					{lists.length === 0 && <div>Nenhuma lista cadastrada</div>}
					<ul className="max-h-80 overflow-y-auto">
						{lists.map(list => {
							const hasFlashcard = !!list.flashcards.find(
								flashcard => flashcard.flashcardId === flashcardId,
							)
							return (
								<ItemFlashcardsList
									key={list.id}
									id={list.id}
									name={list.name}
									quantity={list.flashcards.length}
									hasFlashcard={hasFlashcard}
								/>
							)
						})}
					</ul>
					<hr />
					<div className="flex h-10 w-full justify-around">
						<Dialog open={openCreateList} onOpenChange={setOpenCreateList}>
							<DialogTrigger>
								<Button>Criar nova lista</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Nova lista Personalizada</DialogTitle>
									<DialogDescription>
										Você pode agrupar em suas listas os flashcards que deseja
										revisar posteriormente.
									</DialogDescription>
								</DialogHeader>
								<Form
									className="space-y-3"
									method="post"
									{...getFormProps(form)}
								>
									<input
										type="text"
										hidden
										name="intent"
										value="createList"
										readOnly
									/>
									<Field
										labelProps={{ children: 'Nome' }}
										errors={fields.name.errors}
										inputProps={{
											...getInputProps(fields.name, { type: 'text' }),
										}}
									/>
									<ErrorList errors={form.errors} />
									<StatusButton
										form={form.id}
										type="submit"
										disabled={isPending}
										status={isPending ? 'pending' : 'idle'}
									>
										Salvar
									</StatusButton>
								</Form>
							</DialogContent>
						</Dialog>
						<Button onClick={back} variant="secondary">
							Voltar
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function ItemFlashcardsList({
	hasFlashcard,
	id,
	name,
	quantity,
}: {
	id: string
	name: string
	quantity: number
	hasFlashcard: boolean
}) {
	const fetcher = useFetcher()

	let hasFlashcardOtimistic = hasFlashcard
	if (fetcher.state !== 'idle' && fetcher.formData?.get('flashcardOnList')) {
		hasFlashcardOtimistic = fetcher.formData?.get('add') === 'on'
	}

	return (
		<li className="flex items-center justify-between px-6 py-1">
			<div className="flex flex-col">
				<span className="font-semibold text-primary">{name}</span>
				<div className="space-x-2">
					<span className="text-primary">Numero de flashcards:</span>
					<span className="text-sm text-[#54595E99]">{quantity}</span>
				</div>
			</div>
			<fetcher.Form method="post">
				<input
					type="text"
					readOnly
					hidden
					name="intent"
					value="flashcardOnList"
				/>
				<input type="text" readOnly hidden name="listId" value={id} />
				<button
					type="submit"
					name="add"
					value={!hasFlashcardOtimistic ? 'on' : ''}
				>
					{!hasFlashcardOtimistic ? (
						<div className="h-7 w-7 cursor-pointer rounded border-2 border-primary hover:bg-primary/10" />
					) : (
						<div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border-2 border-primary bg-primary hover:bg-primary/90">
							<Icon name="check" className="h-7 w-7 text-white" />
						</div>
					)}
				</button>
			</fetcher.Form>
		</li>
	)
}
