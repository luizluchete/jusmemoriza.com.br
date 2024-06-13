import { type Flashcard as FlashcardPrisma } from '@prisma/client'
import { Form, Link, useLocation, useNavigation } from '@remix-run/react'
import { useCallback, useEffect, useState } from 'react'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	type CarouselApi,
} from '#app/components/ui/carousel'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { Flashcard } from './__flashcard'

type CarouselProps = {
	flashcards: Array<
		Pick<FlashcardPrisma, 'id' | 'frente' | 'verso'> & {
			fundamento?: string | null
			materia: { name: string }
			lei: { name: string }
			favorite: boolean
		}
	>
	tipo: string
}
export function CarouselFlashcards({ flashcards, tipo }: CarouselProps) {
	const [api, setApi] = useState<CarouselApi>()
	const [index, setIndex] = useState(0)

	const logSlidesInView = useCallback((api: CarouselApi) => {
		if (api) {
			setIndex(api.slidesInView().at(0) || 0)
		}
	}, [])

	function next() {
		if (api?.canScrollNext()) {
			api.scrollNext()
		}
	}
	useEffect(() => {
		if (api) api.on('slidesInView', logSlidesInView)
	}, [api, logSlidesInView])

	const current = flashcards[index]

	let flashcardFavorite = current.favorite
	const navigation = useNavigation()
	if (
		navigation.state !== 'idle' &&
		navigation.formData?.get('intent') === 'favoritar'
	) {
		flashcardFavorite = navigation.formData?.get('favorite') === 'yes'
	}

	const location = useLocation()
	return (
		<Carousel
			setApi={setApi}
			className="mx-auto flex max-h-dvh min-w-[448px] max-w-md flex-col justify-center"
			opts={{ watchDrag: undefined }}
		>
			<CarouselContent>
				{flashcards.map(flashcard => (
					<CarouselItem key={flashcard.id}>
						<Flashcard flashcard={flashcard} next={next} tipo={tipo} />
					</CarouselItem>
				))}
			</CarouselContent>
			{tipo === 'sabia' || tipo === 'duvida' || tipo === 'nao_sabia' ? (
				<CarouselNext />
			) : null}

			<div className="mt-3 flex w-full justify-around rounded-md shadow-md">
				<Form method="post">
					<input type="hidden" value={current?.id} name="id" readOnly />
					<input
						type="hidden"
						name="favorite"
						value={flashcardFavorite ? '' : 'yes'}
						readOnly
					/>
					<button type="submit" name="intent" value="favoritar">
						<div className="flex flex-col items-center text-primary hover:text-red-500">
							{flashcardFavorite ? (
								<Icon name="heart" className="h-6 w-6 text-red-500" />
							) : (
								<Icon name="heart-outline" className="h-6 w-6" />
							)}
							<span className={`${flashcardFavorite ? 'text-red-500' : ''}`}>
								Favoritar
							</span>
						</div>
					</button>
				</Form>
				<Link to={`lists/${current?.id}${location.search}`}>
					<div className="flex flex-col items-center text-primary hover:brightness-125">
						<Icon name="game-card" className="h-6 w-6" />
						<span>Listas</span>
					</div>
				</Link>
				{current?.fundamento ? (
					<Dialog>
						<DialogTrigger>
							<div className="flex cursor-pointer flex-col items-center hover:text-primary">
								<Icon name="books" className="h-6 w-6" />
								<span>Fundamento</span>
							</div>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Fundamento</DialogTitle>
								<DialogDescription>
									<div
										className="overflow-auto whitespace-normal text-justify"
										dangerouslySetInnerHTML={{
											__html: current.fundamento || '',
										}}
									/>
								</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				) : null}
			</div>
		</Carousel>
	)
}
