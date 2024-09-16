import { invariantResponse } from '@epic-web/invariant'
import { animated, useSpring } from '@react-spring/web'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import {
	Form,
	useFetcher,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useState } from 'react'
import { Field } from '#app/components/forms'
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
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu'
import { Icon } from '#app/components/ui/icon'
import { Pagination } from '#app/components/ui/pagination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useDebounce } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'

const PER_PAGE = 10

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const listId = params.listId
	invariantResponse(listId, 'ListId is required', { status: 404 })
	const list = await prisma.listsUser.findFirst({
		select: { color: true, icon: true, name: true, id: true },
		where: { id: listId, userId },
	})
	invariantResponse(list, 'list not found', { status: 404 })
	const materiaId =
		url.searchParams.get('materiaId') === 'all'
			? undefined
			: url.searchParams.get('materiaId') || undefined
	const searchText = url.searchParams.get('searchText') || undefined
	const flashcards = await prisma.listsUsersFlashcards.findMany({
		select: {
			flashcard: {
				select: {
					id: true,
					frente: true,
					verso: true,
					artigo: {
						select: {
							capitulo: {
								select: {
									titulo: {
										select: {
											lei: {
												select: {
													name: true,
													materia: { select: { name: true, color: true } },
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		where: {
			listId,
			flashcard: {
				OR: searchText
					? [
							{ frente: { contains: searchText, mode: 'insensitive' } },
							{ verso: { contains: searchText, mode: 'insensitive' } },
						]
					: undefined,
				artigo: { capitulo: { titulo: { lei: { materiaId } } } },
			},
		},
		skip: (page - 1) * PER_PAGE,
		take: PER_PAGE,
	})
	const [count] = await Promise.all([
		prisma.listsUsersFlashcards.count({
			where: { listId: listId },
		}),
	])

	const materias = await prisma.materia.findMany({
		select: { id: true, name: true },
	})
	return json({
		materias,
		count,
		list,
		flashcards: flashcards.map(({ flashcard }) => ({
			id: flashcard!.id,
			frente: flashcard!.frente,
			verso: flashcard!.verso,
			lei: flashcard!.artigo.capitulo.titulo.lei.name,
			materia: {
				name: flashcard!.artigo.capitulo.titulo.lei.materia.name,
				color: flashcard!.artigo.capitulo.titulo.lei.materia.color,
			},
		})),
	})
}

const intentRemoveFlashcard = 'remove-flashcard'
export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const listId = params.listId
	invariantResponse(listId, 'ListId is required')
	const _intent = formData.get('intent')
	if (_intent === intentRemoveFlashcard) {
		return removerFlashcardAction(formData, userId, listId)
	}
	return json({ message: 'invalid intent' }, { status: 400 })
}

export default function () {
	const { count, flashcards, materias } = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const page = Number(searchParams.get('page')) || 1
	const submit = useSubmit()
	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)
	return (
		<div className="flex max-h-screen flex-col">
			<Form
				className="flex w-full space-x-2"
				onChange={e => submit(e.currentTarget)}
			>
				<Select
					name="materiaId"
					defaultValue={searchParams.get('materiaId') || undefined}
				>
					<SelectTrigger className="w-1/3">
						<SelectValue placeholder="Matéria" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todas</SelectItem>
						{materias.map(materia => (
							<SelectItem key={materia.id} value={materia.id}>
								{materia.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Field
					className="w-full"
					inputProps={{
						name: 'searchText',
						placeholder: 'Pequise por palavra chave',
						defaultValue: searchParams.get('searchText') || undefined,
						onChange: e => {
							e.stopPropagation()
							handleFormChange(e.currentTarget.form!)
						},
					}}
				/>
			</Form>
			<div className="mt-5 grid grid-cols-1 place-items-center gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
				{flashcards.map(flashcard => (
					<Card
						key={flashcard.id}
						id={flashcard.id}
						color={flashcard.materia.color || 'black'}
						frente={flashcard.frente}
						verso={flashcard.verso}
						materia={flashcard.materia.name}
						lei={flashcard.lei}
					/>
				))}
			</div>
			<Pagination
				totalRegisters={count}
				registerPerPage={PER_PAGE}
				currentPage={page}
			/>
		</div>
	)
}

type CardProps = {
	id: string
	color: string
	frente: string
	verso: string
	materia: string
	lei: string
}
function Card({ color, frente, lei, materia, verso, id }: CardProps) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(1000px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})
	return (
		<div className="relative h-[355px] w-full max-w-60 cursor-pointer transition-all duration-300 hover:-translate-y-2">
			<animated.div
				style={{ transform }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-1 backface-hidden"
			>
				<div className="absolute right-3 top-1 z-10 cursor-pointer">
					<DropdownCard flashcardId={id} />
				</div>
				<div
					className="flex h-full w-full flex-col items-center justify-around rounded-xl border-2 px-1"
					style={{ borderColor: color }}
				>
					<div className="flex flex-col">
						<Icon
							name="circle-wavy-question-fill"
							className="h-20 w-20"
							style={{ color }}
						/>
						<h1
							className="text-center text-xl font-extrabold"
							style={{ color }}
						>
							{materia}
						</h1>
					</div>

					<p className="overflow-auto text-center text-sm font-medium">
						{frente}
					</p>

					<h3 className="text-center text-xs font-semibold opacity-80">
						{lei}
					</h3>
				</div>
			</animated.div>
			<animated.div
				style={{ transform, rotateY: '180deg' }}
				onClick={() => setFlipped(state => !state)}
				id="card-frente"
				className="absolute h-full w-full rounded-xl border border-[#D2D2D2] bg-gradient-to-r from-[#FCFCFC] to-[#F2F2F2] p-1 backface-hidden"
			>
				<div
					className="flex h-full w-full flex-col items-center justify-start rounded-xl border-2  p-1"
					style={{ borderColor: color }}
				>
					<div className="flex h-full w-full flex-1 flex-col space-y-5">
						<span
							className="text-center text-xl font-extrabold"
							style={{ color }}
						>
							Resposta
						</span>

						<div className="overflow-auto text-justify text-sm font-normal">
							{verso}
						</div>
					</div>
				</div>
			</animated.div>
		</div>
	)
}

function DropdownCard({ flashcardId }: { flashcardId: string }) {
	return (
		<Dialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild className="focus:outline-none">
					<div
						className="rounded-full hover:bg-gray-200 focus:outline-none"
						onClick={e => e.stopPropagation()}
					>
						<Icon name="dots-horizontal" className="h-4 w-4" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent onClick={e => e.stopPropagation()}>
					<DropdownMenuGroup>
						<DialogTrigger>
							<DropdownMenuItem>
								<div className="cursor-pointer text-red-500">
									<Icon name="trash" className="mr-2 h-5 w-5" />
									<span>Remover flashcard</span>
								</div>
							</DropdownMenuItem>
						</DialogTrigger>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<RemoverFlashcard flashcardId={flashcardId} />
		</Dialog>
	)
}

async function removerFlashcardAction(
	formData: FormData,
	userId: string,
	listId: string,
) {
	const flashcardId = String(formData.get('id'))
	const exists = await prisma.listsUsersFlashcards.findFirst({
		where: { listId, flashcardId, list: { userId } },
	})
	if (exists) {
		await prisma.listsUsersFlashcards.delete({ where: { id: exists.id } })
	}
	return json(
		{ message: 'success' },
		{
			headers: await createToastHeaders({
				description: 'Flashcard removido com sucesso',
				type: 'success',
			}),
		},
	)
}
function RemoverFlashcard({ flashcardId }: { flashcardId: string }) {
	const fetcher = useFetcher()
	const isPending = fetcher.state === 'submitting'
	return (
		<>
			<DialogContent onClick={e => e.stopPropagation()}>
				<DialogHeader>
					<DialogTitle>Você tem certeza?</DialogTitle>
					<DialogDescription>
						Esta ação vai remover o flashcard de sua lista personalizada.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<fetcher.Form method="post">
						<input type="hidden" name="intent" value={intentRemoveFlashcard} />
						<input type="hidden" name="id" value={flashcardId} />
						<Button type="submit" variant="destructive" disabled={isPending}>
							{isPending ? 'Removendo...' : 'Remover'}
						</Button>
					</fetcher.Form>
				</DialogFooter>
			</DialogContent>
		</>
	)
}
