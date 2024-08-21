import { Prisma } from '@prisma/client'
import { prisma } from '#app/utils/db.server'

type Input = {
	tipo?: string
	page?: number
	userId: string
	comboId?: string[]
	materiaId?: string[]
	leiId?: string[]
	tituloId?: string[]
	capituloId?: string[]
	artigoId?: string[]
}

//features futura = filtrar por combos habilitados no usuário
export async function countFlashcards({
	userId,
	artigoId,
	capituloId,
	leiId,
	materiaId,
	tituloId,
}: Input) {
	const whereMateria =
		materiaId && materiaId.length > 0
			? Prisma.sql`and materias.id in (${Prisma.join(materiaId)})`
			: Prisma.empty
	const whereLei =
		leiId && leiId.length > 0
			? Prisma.sql`and leis.id in (${Prisma.join(leiId)})`
			: Prisma.empty
	const whereTitulo =
		tituloId && tituloId.length > 0
			? Prisma.sql`and titulos.id in (${Prisma.join(tituloId)})`
			: Prisma.empty
	const whereCapitulo =
		capituloId && capituloId.length > 0
			? Prisma.sql`and capitulos.id in (${Prisma.join(capituloId)})`
			: Prisma.empty
	const whereArtigo =
		artigoId && artigoId.length > 0
			? Prisma.sql`and artigos.id in (${Prisma.join(artigoId)})`
			: Prisma.empty
	const query = await prisma.$queryRaw<
		{
			total: number
			sabia: number
			duvida: number
			naoSabia: number
		}[]
	>`
    select count(f.id) total,
           sum(case (select fua.answer from flashcard_user_answers fua
                      where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                      order by fua."createdAt" desc
                      limit 1) when 'sabia' then 1 else 0 end) sabia,
           sum(case (select fua.answer from flashcard_user_answers fua
                      where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                      order by fua."createdAt" desc
                       limit 1) when 'duvida' then 1 else 0 end) duvida,
           sum(case (select fua.answer from flashcard_user_answers fua
                      where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                      order by fua."createdAt" desc
                       limit 1) when 'nao_sabia' then 1 else 0 end) "naoSabia"
      from "Flashcard" f, materias, leis, titulos, capitulos, artigos
     where f."artigoId" = artigos.id
       and artigos."capituloId" = capitulos.id
       and capitulos."tituloId" = titulos.id
       and titulos."leiId" = leis.id 
       and leis."materiaId" = materias.id
       and materias.status = true
       and leis.status = true
       and titulos.status = true 
       and capitulos.status = true
       and artigos.status = true
       and f.status = true
      ${whereMateria}
       ${whereLei}
       ${whereTitulo}
       ${whereCapitulo}
       ${whereArtigo}
	   and not exists (select 1 from "FlashcardIgnore" 
		where "FlashcardIgnore"."flashcardId" = f.id
		  and "FlashcardIgnore"."userId" = ${userId})
  `

	//   and exists (select 1 from "LeisOnCombos" loc
	//     where loc."leiId" = leis.id
	//    and loc."comboId" = ${comboId})  filtrar combos do usuario futuramente
	return {
		total: Number(query[0].total),
		sabia: Number(query[0].sabia),
		duvida: Number(query[0].duvida),
		naoSabia: Number(query[0].naoSabia),
	}
}

export async function buscaMateriasParaFiltro() {
	const materias = await prisma.materia.findMany({
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
		where: {
			status: true,
			Lei: {
				some: {
					status: true,
					titulos: {
						some: {
							status: true,
							capitulos: {
								some: {
									status: true,
									artigos: {
										some: {
											status: true,
											flashcards: { some: { status: true } },
										},
									},
								},
							},
						},
					},
				},
			},
		},
	})
	return materias
}

export async function buscaLeisParaFiltro(materiaId: string[]) {
	const leis = await prisma.lei.findMany({
		select: { id: true, name: true },
		where: {
			status: true,
			materiaId: materiaId.length ? { in: materiaId } : undefined,
		},
	})
	return leis
}

export async function buscarFlashcardsPadrao({
	materiaId,
	leiId,
	userId,
}: Input) {
	const whereMateria =
		materiaId && materiaId.length > 0
			? Prisma.sql`and materias.id in (${Prisma.join(materiaId)})`
			: Prisma.empty
	const whereLei =
		leiId && leiId.length > 0
			? Prisma.sql`and leis.id in (${Prisma.join(leiId)})`
			: Prisma.empty

	const whereIgnoreFlashcard = Prisma.sql`and not exists (select 1 from "FlashcardIgnore" 
														where "FlashcardIgnore"."flashcardId" = f.id
														  and "FlashcardIgnore"."userId" = ${userId})`

	const query = await prisma.$queryRaw<any[]>`
    select f.id,
           f.frente,
           f.verso,
           f.fundamento,
           materias.name as materia,
		   materias.color as color,
           leis.name as lei,
           (select true from "FlashcardUserFavorites" fuf
             where fuf."flashcardId" = f.id
               and fuf."userId" = ${userId}) favorite
      from "Flashcard" f, materias, leis, titulos, capitulos, artigos
     where f."artigoId" = artigos.id
       and artigos."capituloId" = capitulos.id
       and capitulos."tituloId" = titulos.id
       and titulos."leiId" = leis.id 
       and leis."materiaId" = materias.id
       and materias.status = true
       and leis.status = true
       and titulos.status = true 
       and capitulos.status = true
       and artigos.status = true
       and f.status = true
       ${whereMateria}
       ${whereLei}
	   ${whereIgnoreFlashcard}
       and coalesce((select fua.answer from flashcard_user_answers fua
                        where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                        order by fua."createdAt" desc
                       limit 1),'') <> 'sabia' 
      order by random() limit 10                 
                       `

	return query.map(flashcard => ({
		id: String(flashcard.id),
		frente: String(flashcard.frente),
		verso: String(flashcard.verso),
		fundamento: String(flashcard.fundamento) || undefined,
		materia: {
			name: String(flashcard.materia),
			color: String(flashcard.color) || undefined,
		},
		lei: { name: String(flashcard.lei) },
		favorite: !!flashcard.favorite,
	}))
}

export async function buscarFlashcardsPorTipo({
	page = 1,
	userId,
	materiaId,
	leiId,
	tipo,
}: Input) {
	const whereMateria =
		materiaId && materiaId.length > 0
			? Prisma.sql`and materias.id in (${Prisma.join(materiaId)})`
			: Prisma.empty
	const whereLei =
		leiId && leiId.length > 0
			? Prisma.sql`and leis.id in (${Prisma.join(leiId)})`
			: Prisma.empty

	const whereIgnoreFlashcard = Prisma.sql`and not exists (select 1 from "FlashcardIgnore" 
														where "FlashcardIgnore"."flashcardId" = f.id
														  and "FlashcardIgnore"."userId" = ${userId})`
	let tipoQuery = ''
	if (tipo === 'know') {
		tipoQuery = 'sabia'
	} else if (tipo === 'doubt') {
		tipoQuery = 'duvida'
	} else if (tipo === 'noknow') {
		tipoQuery = 'nao_sabia'
	}
	const query = await prisma.$queryRaw<any[]>`
select f.id,
           f.frente,
           f.verso,
           f.fundamento,
           materias.name as materia,
		   materias.color as color,
           leis.name as lei,
           (select true from "FlashcardUserFavorites" fuf
             where fuf."flashcardId" = f.id
               and fuf."userId" = ${userId}) favorite
      from "Flashcard" f, materias, leis, titulos, capitulos, artigos
     where f."artigoId" = artigos.id
       and artigos."capituloId" = capitulos.id
       and capitulos."tituloId" = titulos.id
       and titulos."leiId" = leis.id 
       and leis."materiaId" = materias.id
       and materias.status = true
       and leis.status = true
       and titulos.status = true 
       and capitulos.status = true
       and artigos.status = true
       and f.status = true
       ${whereMateria}
       ${whereLei}
	   ${whereIgnoreFlashcard}
       and (select fua.answer from flashcard_user_answers fua
                        where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                        order by fua."createdAt" desc
                       limit 1) = ${tipoQuery}    
        offset ${(page - 1) * 10} limit 10
    `
	return query.map(flashcard => ({
		id: String(flashcard.id),
		frente: String(flashcard.frente),
		verso: String(flashcard.verso),
		fundamento: String(flashcard.fundamento) || undefined,
		materia: {
			name: String(flashcard.materia),
			color: String(flashcard.color) || undefined,
		},
		lei: { name: String(flashcard.lei) },
		favorite: !!flashcard.favorite,
	}))
}
