import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Outlet,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { CarouselFlashcards } from './__carousel'
import { SheetFilterFlashcards } from './__filtro-flashcards'
import { buscarFlashcards } from './flashcards.server'
const favoriteFlashcardSchema = z.object({
	intent: z.literal('favoritar'),
	id: z.string(),
	favorite: z.coerce.boolean(),
})
const answerFlashcardSchema = z.object({
	intent: z.literal('answer'),
	id: z.string(),
	answer: z.enum(['sabia', 'nao_sabia', 'duvida']),
})
const initialSchema = z.object({
	intent: z.literal('load'),
	tipo: z.enum(['default', 'sabia', 'nao_sabia', 'duvida']).default('default'),
	materiaId: z.array(z.string()).optional(),
	leiId: z.array(z.string()).optional(),
	tituloId: z.array(z.string()).optional(),
	capituloId: z.array(z.string()).optional(),
	artigoId: z.array(z.string()).optional(),
	onlyFavorites: z.coerce.boolean().optional(),
})

const flashcardSChema = z.discriminatedUnion('intent', [
	favoriteFlashcardSchema,
	answerFlashcardSchema,
	initialSchema,
])

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const comboId = params.comboId
	invariantResponse(comboId, 'ComboId is required', { status: 404 })
	const url = new URL(request.url)
	const materiaId = url.searchParams.getAll('materiaId')
	const leiId = url.searchParams.getAll('leiId')
	const tituloId = url.searchParams.getAll('tituloId')
	const capituloId = url.searchParams.getAll('capituloId')

	const materiasPromise = prisma.materia.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			Lei: { some: { combosLeis: { some: { comboId } } } },
		},
	})
	const leisPromise = prisma.lei.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			combosLeis: { some: { comboId } },
			materiaId: materiaId.length ? { in: materiaId } : undefined,
		},
	})
	const titulosPromise = prisma.titulo.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			leiId: leiId.length ? { in: leiId } : undefined,
			lei: {
				combosLeis: { some: { comboId } },
				materiaId: materiaId.length ? { in: materiaId } : undefined,
			},
		},
	})
	const capitulosPromise = prisma.capitulo.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			tituloId: tituloId.length ? { in: tituloId } : undefined,
			titulo: {
				leiId: leiId.length ? { in: leiId } : undefined,
				lei: {
					combosLeis: { some: { comboId } },
					materiaId: materiaId.length ? { in: materiaId } : undefined,
				},
			},
		},
	})
	const artigosPromise = prisma.artigo.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			capituloId: capituloId.length ? { in: capituloId } : undefined,
			capitulo: {
				tituloId: tituloId.length ? { in: tituloId } : undefined,
				titulo: {
					leiId: leiId.length ? { in: leiId } : undefined,
					lei: {
						materiaId: materiaId.length ? { in: materiaId } : undefined,
						combosLeis: { some: { comboId } },
					},
				},
			},
		},
	})
	const [materias, leis, titulos, capitulos, artigos] = await Promise.all([
		materiasPromise,
		leisPromise,
		titulosPromise,
		capitulosPromise,
		artigosPromise,
	])

	const flashcards = await prisma.tempFlashcards.findMany({
		where: { userId },
		select: {
			flashcard: {
				select: {
					frente: true,
					fundamento: true,
					verso: true,
					id: true,
					artigo: {
						select: {
							name: true,
							capitulo: {
								select: {
									name: true,
									titulo: {
										select: {
											name: true,
											lei: {
												select: {
													name: true,
													materia: { select: { name: true } },
												},
											},
										},
									},
								},
							},
						},
					},
					usersFavorites: { where: { userId } },
				},
			},
		},
	})

	return json({
		flashcards: flashcards.map(({ flashcard }) => ({
			id: flashcard.id,
			frente: flashcard.frente,
			verso: flashcard.verso,
			fundamento: flashcard.fundamento,
			materia: flashcard.artigo.capitulo.titulo.lei.materia,
			lei: flashcard.artigo.capitulo.titulo.lei,
			favorite: flashcard.usersFavorites.length > 0,
		})),
		materias,
		leis,
		titulos,
		capitulos,
		artigos,
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const form = await request.formData()

	const submission = parseWithZod(form, {
		schema: flashcardSChema,
	})

	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}

	const { intent } = submission.value
	if (intent === 'answer') {
		const { id, answer } = submission.value
		await prisma.flashcardUserAnswers.create({
			data: { answer, flashcardId: id, userId },
		})
		return json({ result: submission.reply() })
	}

	if (intent === 'favoritar') {
		const { id, favorite } = submission.value
		const exists = await prisma.flashcardUserFavorites.findFirst({
			where: { flashcardId: id, userId },
		})
		if (exists && !favorite) {
			await prisma.flashcardUserFavorites.delete({
				where: { flashcardId_userId: { flashcardId: id, userId } },
			})
			return json({ result: submission.reply() })
		}

		if (!exists && favorite) {
			await prisma.flashcardUserFavorites.create({
				data: { flashcardId: id, userId },
			})
			return json({ result: submission.reply() })
		}
	}

	if (intent === 'load') {
		const { comboId } = params
		invariantResponse(comboId, 'ComboId is required', { status: 404 })
		const {
			tipo,
			artigoId,
			capituloId,
			leiId,
			materiaId,
			tituloId,
			onlyFavorites,
		} = submission.value
		console.log({ ...submission.value })
		const flashcards = await buscarFlashcards({
			userId,
			comboId,
			tipo,
			artigoId,
			capituloId,
			leiId,
			materiaId,
			onlyFavorites,
			tituloId,
		})
		await prisma.tempFlashcards.deleteMany({ where: { userId } })
		await prisma.tempFlashcards.createMany({
			data: flashcards.map(flashcard => ({
				userId,
				flashcardId: flashcard.id,
			})),
		})
		return json({ tipo })
	}

	return json(null)
}

export default function ComboId() {
	const { flashcards, materias, artigos, capitulos, leis, titulos } =
		useLoaderData<typeof loader>()
	const actionData = useActionData() as any
	const tipo = actionData?.tipo || 'default'
	const navigation = useNavigation()
	const resetCarousel =
		navigation.formData?.get('intent') === 'load' ? 'reset' : 'default'
	console.log({ tipo })
	return (
		<div>
			<Outlet />
			<SheetFilterFlashcards
				title={'Filtros'}
				materias={materias}
				leis={leis}
				titulos={titulos}
				capitulos={capitulos}
				artigos={artigos}
			/>
			{flashcards.length > 0 ? (
				<>
					<CarouselFlashcards
						key={resetCarousel}
						tipo={tipo}
						flashcards={flashcards}
					/>
				</>
			) : (
				<span className="flex max-w-md text-wrap text-center text-xl font-semibold">
					Nenhum flashcard encontrado, verifique os filtros ou a pilha
					selecionada !
				</span>
			)}
		</div>
	)
}
