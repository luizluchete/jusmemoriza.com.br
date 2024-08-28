import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { Link, useFetcher, useLoaderData } from '@remix-run/react'
import { useEffect, useState } from 'react'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu'
import { Icon } from '#app/components/ui/icon'
import { Label } from '#app/components/ui/label'
import {
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	Select,
} from '#app/components/ui/select'
import { StatusButton } from '#app/components/ui/status-button'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { createToastHeaders } from '#app/utils/toast.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const lists = await prisma.listsUser.findMany({
		select: {
			id: true,
			name: true,
			color: true,
			icon: true,
			_count: {
				select: {
					flashcards: {
						where: {
							NOT: { OR: [{ flashcardId: '' }, { flashcardId: null }] },
						},
					},
				},
			},
		},
		where: { userId },
		orderBy: { name: 'asc' },
	})

	return json({
		lists: lists.map(({ _count, id, name, color, icon }) => ({
			id,
			name,
			color,
			icon,
			countFlashcards: _count.flashcards,
		})),
	})
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)
	const { intent } = Object.fromEntries(formData)
	if (intent === 'user-list-editor') {
		return userListFlashcardAction(formData, userId)
	}

	if (intent === 'user-list-remove') {
		const id = String(formData.get('id'))
		const exists = await prisma.listsUser.findFirst({
			select: { id: true },
			where: { id, userId },
		})
		if (exists) {
			await prisma.$transaction([
				prisma.listsUsersFlashcards.deleteMany({ where: { listId: id } }),
				prisma.listsUser.delete({ where: { id } }),
			])
		}
		return json(
			{ result: { message: 'success' } },
			{
				headers: await createToastHeaders({
					description: 'Lista excluída com sucesso !',
					type: 'success',
				}),
			},
		)
	}

	return json({ message: 'invalid intent' }, { status: 400 })
}

export default function Index() {
	const { lists } = useLoaderData<typeof loader>()
	return (
		<div>
			<div>
				<div className="mb-5 flex w-full flex-col items-center justify-center space-y-1">
					<h2 className="text-center text-xl font-semibold text-primary">
						Escolha uma de suas listas personalizadas para revisar
					</h2>
					<h3 className="text-sm font-normal text-gray-500">
						Selecione abaixo sua lista para estudar
					</h3>
				</div>
				<hr />
			</div>

			{lists.length === 0 && (
				<div className="flex items-center justify-center p-20">
					Nenhuma lista cadastrada
				</div>
			)}

			<ul className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-6 lg:grid-cols-2 xl:grid-cols-4">
				{lists.map(list => (
					<Link key={list.id} to={`${list.id}/flashcards`} className="relative">
						<div
							className="relative flex w-full cursor-pointer items-center space-x-2 rounded-lg border px-4 py-3 hover:shadow-md"
							style={{ borderColor: list.color || undefined }}
						>
							<div className="relative flex h-20 w-20 items-center justify-center">
								<Icon
									name="circle-wavy-fill"
									className="absolute h-20 w-20"
									style={{ color: list.color || undefined }}
								/>
								<Icon
									name={list.icon as keyof typeof Icon}
									className="absolute h-10 w-10"
								/>
							</div>

							<div className="flex h-full w-2/3 flex-1 flex-col justify-center truncate text-ellipsis p-1">
								<h3 className=" text-xl font-medium text-gray-700">
									{list.name}
								</h3>
								<div className="flex justify-between">
									<span className="font-medium text-gray-500">
										{list.countFlashcards} flashcards
									</span>
								</div>
							</div>

							<div className="absolute right-2 top-1 z-10 cursor-pointer">
								<DropdownCard
									list={{
										...list,
										color: list.color || undefined,
										icon: list.icon || undefined,
									}}
								/>
							</div>
						</div>
					</Link>
				))}
			</ul>
		</div>
	)
}

function DropdownCard({
	list,
}: {
	list: { id: string; name: string; color?: string; icon?: string }
}) {
	const [open, setOpen] = useState(false)
	const [view, setView] = useState<'edit' | 'remove'>('edit')

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild className="focus:outline-none">
					<div
						className="rounded-full p-1 hover:bg-gray-100 focus:outline-none"
						onClick={e => e.stopPropagation()}
					>
						<Icon name="dots-horizontal" className="h-5 w-5" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent onClick={e => e.stopPropagation()}>
					<DropdownMenuGroup>
						<DialogTrigger className="w-full">
							<DropdownMenuItem onSelect={e => setView('edit')}>
								<div>
									<Icon name="pencil-1" className="mr-2 h-5 w-5" />
									<span>Editar</span>
								</div>
							</DropdownMenuItem>
						</DialogTrigger>
						<DropdownMenuSeparator />
						<DialogTrigger className="w-full">
							<DropdownMenuItem onSelect={e => setView('remove')}>
								<div className="text-red-500">
									<Icon name="trash" className="mr-2 h-5 w-5" />
									<span>Excluir Lista</span>
								</div>
							</DropdownMenuItem>
						</DialogTrigger>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			{view === 'edit' ? (
				<EditList list={list} setOpen={setOpen} />
			) : view === 'remove' ? (
				<RemoveList id={list.id} />
			) : null}
		</Dialog>
	)
}

const cores = [
	{ name: 'Laranja vibrante', cor: '#FFA8A8' },
	{ name: 'Verde vibrante', cor: '#FF865C' },
	{ name: 'Azul vibrante', cor: '#87CCA3' },
	{ name: 'Rosa brilhante', cor: '#FFA5DA' },
	{ name: 'Dourado', cor: '#FF6B6B' },
	{ name: 'Roxo', cor: '#F46137' },
	{ name: 'Verde-água', cor: '#B5A3E8' },
	{ name: 'Laranja avermelhado', cor: '#FF8CC7' },
	{ name: 'Azul Dodger', cor: '#F95757' },
	{ name: 'Tomate (vermelho suave)', cor: '#D4F2E4' },
	{ name: 'Tomate (vermelho suave)', cor: '#FFC076' },
	{ name: 'Tomate (vermelho suave)', cor: '#FF9C41' },
	{ name: 'Tomate (vermelho suave)', cor: '#FFAD86' },
	{ name: 'Tomate (vermelho suave)', cor: '#A8E6CF' },
	{ name: 'Tomate (vermelho suave)', cor: '#F5D14F' },
	{ name: 'Tomate (vermelho suave)', cor: '#C4EFB8' },
]

const icons = [
	'list-balanca',
	'list-tribunal',
	'list-home',
	'list-money',
	'list-card',
	'list-statistics',
	'list-calc',
	'list-tree',
] as const
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

async function userListFlashcardAction(formData: FormData, userId: string) {
	const submission = await parseWithZod(formData, {
		schema: schemaUserListFlashcard.superRefine(async (data, ctx) => {
			const exists = await prisma.listsUser.findFirst({
				where: {
					userId,
					name: { equals: data.name, mode: 'insensitive' },
					id: { not: { equals: data.id } },
				},
			})
			if (exists) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Você já tem uma lista com esse nome',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { color, icon, name, id } = submission.value
	await prisma.listsUser.upsert({
		where: { id: id ?? '__new__', userId },
		create: {
			name,
			color,
			icon,
			userId,
		},
		update: {
			name,
			color,
			icon,
		},
	})
	return json(
		{ result: submission.reply() },
		{
			headers: await createToastHeaders({
				description: 'Salvo com sucesso !',
				type: 'success',
			}),
		},
	)
}

function EditList({
	list,
	setOpen,
}: {
	list: { id: string; name: string; color?: string; icon?: string }
	setOpen: (open: boolean) => void
}) {
	const fetcher = useFetcher<typeof userListFlashcardAction>()
	const [color, setColor] = useState(list?.color || cores[0].cor)
	const isPending = fetcher.state === 'submitting'
	const [form, fields] = useForm({
		id: `user-list-flashcard-editor-${list?.id}`,
		constraint: getZodConstraint(schemaUserListFlashcard),
		lastResult: fetcher.data?.result,
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
	const submittinNewList =
		fetcher.state === 'idle' && fetcher.data?.result?.status === 'success'

	useEffect(() => {
		if (submittinNewList) {
			setOpen(false)
		}
	}, [submittinNewList, setOpen])

	return (
		<DialogContent onClick={e => e.stopPropagation()}>
			<DialogHeader>
				<DialogTitle>Editar Lista</DialogTitle>
				<DialogDescription>
					Faça alterações em sua lista aqui. Clique em salvar quando terminar.
				</DialogDescription>
			</DialogHeader>
			<fetcher.Form className="space-y-3" method="post" {...getFormProps(form)}>
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
				<div className="flex space-x-10">
					<div>
						<Label>Icone</Label>
						<Select {...getInputProps(fields.icon, { type: 'text' })}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Selecione um icone" />
							</SelectTrigger>
							<SelectContent>
								{icons.map(icon => (
									<SelectItem key={icon} value={icon}>
										<div className="flex items-center space-x-2">
											<div
												className="flex h-10 w-10 items-center justify-center rounded-full p-2"
												style={{ backgroundColor: color }}
											>
												<Icon
													name={icon}
													className="h-full w-full text-white"
												/>
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<ErrorList errors={fields.icon.errors} />
					</div>
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
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<ErrorList errors={fields.color.errors} />
					</div>
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
			</fetcher.Form>
		</DialogContent>
	)
}

function RemoveList({ id }: { id: string }) {
	const fetcher = useFetcher()
	return (
		<DialogContent onClick={e => e.stopPropagation()}>
			<DialogHeader>
				<DialogTitle>Você tem certeza absoluta?</DialogTitle>
				<DialogDescription>
					Esta ação não pode ser desfeita. Isso excluirá permanentemente sua
					lista e todos os flashcards associados.
				</DialogDescription>
			</DialogHeader>

			<DialogFooter>
				<fetcher.Form method="post">
					<input type="hidden" name="intent" value="user-list-remove" />
					<input type="hidden" name="id" value={id} />
					<Button type="submit" variant="destructive">
						Excluir
					</Button>
				</fetcher.Form>
			</DialogFooter>
		</DialogContent>
	)
}
