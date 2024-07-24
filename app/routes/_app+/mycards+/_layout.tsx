import { animated, useSpring } from '@react-spring/web'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, Outlet, useFetcher, useLoaderData } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Button } from '#app/components/ui/button'
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '#app/components/ui/carousel'
import { Icon } from '#app/components/ui/icon'
import frenteFlashcard from '#app/components/ui/img/frente-flashcard.jpeg'
import versoFlashcard from '#app/components/ui/img/verso-flashcard.jpeg'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, useDoubleCheck } from '#app/utils/misc.js'
import { createToastHeaders } from '#app/utils/toast.server.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const myFlashcards = await prisma.userFlashcard.findMany({
		select: {
			id: true,
			frente: true,
			verso: true,
			lei: { select: { name: true, materia: { select: { name: true } } } },
		},
		where: { userId },
		orderBy: { updatedAt: 'desc' },
	})
	return json({ myFlashcards })
}

const excluirMyFlashcardIntent = 'excluirMyFlashcard'
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = String(formData.get('intent'))
	if (intent === excluirMyFlashcardIntent) {
		return excluirMyFlashcardAction({ formData, userId })
	}
	return json({ message: 'invalid intent' }, { status: 400 })
}

export default function Index() {
	const { myFlashcards } = useLoaderData<typeof loader>()
	const [api, setApi] = useState<CarouselApi>()
	const [index, setIndex] = useState(0)
	useEffect(() => {
		if (api) {
			api.on('slidesInView', () => {
				setIndex(api.slidesInView().at(0) || 0)
			})
		}
	}, [api])

	return (
		<>
			<Outlet />
			<div className="flex">
				<div className="min-w-fit">
					<Link to="new">
						<Button>Novo Flashcard</Button>
					</Link>
				</div>
				{myFlashcards.length ? (
					<Carousel
						setApi={setApi}
						className="mx-auto max-w-md flex-1"
						opts={{ dragFree: false }}
					>
						<div className="my-1 flex flex-col rounded-md border px-2 py-1 shadow-md">
							<h1 className="font-medium">Seus Flashcards</h1>
							<span className="text-center text-xl font-bold">
								<span className="text-3xl">{index + 1}</span> /{' '}
								{myFlashcards.length}
							</span>
						</div>
						<CarouselContent>
							{myFlashcards.map(flashcard => {
								return (
									<CarouselItem key={flashcard.id}>
										<MyFlashcard flashcard={flashcard} />
									</CarouselItem>
								)
							})}
						</CarouselContent>
						<CarouselNext />
						<CarouselPrevious />
					</Carousel>
				) : (
					<div className="flex w-full items-center justify-center ">
						<span className="mx-auto">Nenhum flashcard cadastrado</span>
					</div>
				)}
			</div>
		</>
	)
}

function MyFlashcard({
	flashcard: { frente, verso, lei, id },
}: {
	flashcard: {
		id: string
		frente: string
		verso: string

		lei: {
			name: string
			materia: {
				name: string
			}
		}
	}
}) {
	const [flipped, setFlipped] = useState(false)
	const { transform } = useSpring({
		transform: `perspective(600px) rotateY(${flipped ? 180 : 0}deg)`,
		config: { mass: 5, tension: 500, friction: 80 },
	})

	return (
		<div className="relative h-[600px] w-[440px]">
			<animated.div
				style={{ transform }}
				className="absolute flex h-full w-full rounded-md border shadow-md backface-hidden"
				onClick={() => setFlipped(state => !state)}
			>
				<img
					src={frenteFlashcard}
					alt="frente-card"
					className="absolute z-0 h-full w-full rounded-md object-cover"
				/>
				<div className="z-10 flex h-full w-full flex-col justify-between rounded-lg border-t-8 border-black">
					<div className="mt-20 flex w-full flex-col items-center justify-center space-y-5">
						<div className="flex h-24 w-24 items-center justify-center rounded-full bg-black p-4 shadow-xl">
							<Icon
								name="question"
								className="h-full w-full rounded-full object-cover text-white"
							/>
						</div>

						<h1 className="text-3xl font-bold">{lei.materia.name}</h1>
						<div
							className="flex-1 overflow-auto px-5 text-justify text-xl text-gray-600"
							dangerouslySetInnerHTML={{ __html: frente }}
						/>
					</div>
					<div className="flex w-full justify-center">
						<h2 className="mb-5 text-2xl font-semibold text-gray-600">
							{lei.name}
						</h2>
					</div>
				</div>
			</animated.div>

			<animated.div
				style={{ transform, rotateY: '180deg' }}
				className="absolute flex h-full w-full rounded-md border shadow-md backface-hidden"
				onClick={() => setFlipped(state => !state)}
			>
				<img
					src={versoFlashcard}
					alt="verso-card"
					className="absolute z-0 h-full w-full rounded-md object-cover"
				/>
				<div className="z-10 flex h-full w-full flex-col justify-between rounded-lg border-t-8 border-black">
					<div className="flex w-full items-center justify-end space-x-5 p-2">
						<ExcluirMyFlashcard flashcardId={id} />
						<Link
							to={`${id}/edit`}
							onClick={e => e.stopPropagation()}
							className="flex flex-col items-center text-black transition-all duration-100 hover:scale-105"
						>
							<Icon name="pencil-1" />
							<span>Editar</span>
						</Link>
					</div>
					<div className="flex w-full flex-1 flex-col space-y-3 px-3">
						<span className="text-3xl font-bold">Resposta</span>
						<div
							className="flex-1 overflow-auto text-justify text-xl text-gray-600"
							dangerouslySetInnerHTML={{ __html: verso }}
						/>
					</div>
				</div>
			</animated.div>
		</div>
	)
}

async function excluirMyFlashcardAction({
	formData,
	userId,
}: {
	userId: string
	formData: FormData
}) {
	const flashcardId = String(formData.get('id'))
	const exists = await prisma.userFlashcard.findFirst({
		where: {
			id: flashcardId,
			userId,
		},
	})
	if (exists) {
		await prisma.userFlashcard.delete({ where: { id: exists.id } })
	}
	return json(
		{ result: 'sucess' },
		{
			headers: await createToastHeaders({
				description: 'Flashcard excluído com sucesso',
			}),
		},
	)
}

function ExcluirMyFlashcard({ flashcardId }: { flashcardId: string }) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()

	return (
		<fetcher.Form method="POST">
			<input type="hidden" hidden value={flashcardId} readOnly name="id" />
			<button
				{...dc.getButtonProps({
					type: 'submit',
					name: 'intent',
					value: excluirMyFlashcardIntent,
					onClick: e => e.stopPropagation(),
				})}
				disabled={fetcher.state !== 'idle'}
				className={cn(
					'flex flex-col items-center transition-all duration-100 hover:scale-105',
					dc.doubleCheck
						? 'rounded-md bg-red-500 p-1 text-white'
						: 'text-red-500 hover:text-red-700',
				)}
			>
				<Icon name="trash" className="h-6 w-6" />
				<span> {dc.doubleCheck ? `Tem Certeza?` : `Excluir`}</span>
			</button>
		</fetcher.Form>
	)
}
