import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import { UserListFlashcardsEditor } from '#app/components/ui/__user-list-flashcards-editor'
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
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { userListFlashcardAction } from '#app/utils/services/user-list-flashcards.server'
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
		const submission = await userListFlashcardAction(formData, userId)
		return json(submission, {
			headers: await createToastHeaders({
				description: 'Salvo com sucesso !',
				type: 'success',
			}),
		})
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

			<ul className="mt-3 grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
				{lists.map(list => (
					<div key={list.id}>
						<div className="relative flex h-28 w-full max-w-96 items-center  space-x-2 rounded-lg border border-gray-300 px-4 hover:shadow-md">
							<div
								className="flex h-16 w-16 items-center justify-center rounded-full"
								style={{ backgroundColor: list.color || undefined }}
							>
								{list.icon ? (
									<Icon
										name={list.icon as keyof typeof Icon}
										className="h-10 w-10 text-white"
									/>
								) : null}
							</div>
							<div className="flex h-full flex-1 flex-col justify-center">
								<h3 className="text-ellipsis text-xl font-bold text-gray-700">
									{list.name}
								</h3>
								<div className="flex justify-between">
									<span className="text-gray-500">
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
					</div>
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
				<EditList list={list} />
			) : view === 'remove' ? (
				<RemoveList id={list.id} />
			) : null}
		</Dialog>
	)
}

function EditList({
	list,
}: {
	list: { id: string; name: string; color?: string; icon?: string }
}) {
	return (
		<DialogContent onClick={e => e.stopPropagation()}>
			<DialogHeader>
				<DialogTitle>Editar Lista</DialogTitle>
				<DialogDescription>
					Faça alterações em sua lista aqui. Clique em salvar quando terminar.
				</DialogDescription>
			</DialogHeader>
			<UserListFlashcardsEditor list={list} />
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
