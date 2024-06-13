import { Prisma } from '@prisma/client'
import { prisma } from '#app/utils/db.server'

type Input = {
	tipo?: string
	userId: string
	comboId: string
	onlyFavorites?: boolean
  materiaId?: string[]
  leiId?: string[]
  tituloId?: string[]
  capituloId?: string[]
  artigoId?: string[] 
}

export async function countFlashcards({ comboId, userId }: Input) {
	const query = await prisma.$queryRaw<
		{
			total: number
			sabia: number
			duvida: number
			naoSabia: number
			favorite: number
		}[]
	>`
    
    select count(f.id) total,
           sum(coalesce((select 1 from "FlashcardUserFavorites" fuf
                 		      where fuf."flashcardId" = f.id
                 		        and fuf."userId" = ${userId}), 0)) as favorite,
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
       and exists (select 1 from "LeisOnCombos" loc
     	   		        where loc."leiId" = leis.id
     				      and loc."comboId" = ${comboId})
				               
  `
	return {
		total: Number(query[0].total),
		favorite: Number(query[0].favorite),
		sabia: Number(query[0].sabia),
		duvida: Number(query[0].duvida),
		naoSabia: Number(query[0].naoSabia),
	}
}

export async function buscarFlashcards({ comboId, userId, tipo,materiaId,artigoId,capituloId,leiId,onlyFavorites,tituloId }: Input) {
	let tipoQuery = tipo
	if (tipo !== 'sabia' && tipo !== 'duvida' && tipo !== 'nao_sabia') {
		tipoQuery = 'default'
	}

  const whereMateria = materiaId ? Prisma.sql`and materias.id in (${Prisma.join(materiaId)})` : Prisma.empty
  const whereLei = leiId ? Prisma.sql`and leis.id in (${Prisma.join(leiId)})` : Prisma.empty
  const whereTitulo = tituloId ? Prisma.sql`and titulos.id in (${Prisma.join(tituloId)})` : Prisma.empty
  const whereCapitulo = capituloId ? Prisma.sql`and capitulos.id in (${Prisma.join(capituloId)})` : Prisma.empty
  const whereArtigo = artigoId ? Prisma.sql`and artigos.id in (${Prisma.join(artigoId)})` : Prisma.empty


	if (tipoQuery === 'default') {
		const query =  await prisma.$queryRaw<any[]>`
    select f.id,
           f.frente,
           f.verso,
           f.fundamento,
           materias.name as materia,
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
       ${whereTitulo}
       ${whereCapitulo}
       ${whereArtigo}
       and exists (select 1 from "LeisOnCombos" loc
     	   		        where loc."leiId" = leis.id
     				          and loc."comboId" = ${comboId})
       and coalesce((select fua.answer from flashcard_user_answers fua
                        where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                        order by fua."createdAt" desc
                       limit 1),'') <> 'sabia' 
                       `


		return query.map(flashcard => ({
			id: String(flashcard.id),
			frente: String(flashcard.frente),
			verso: String(flashcard.verso),
			fundamento: String(flashcard.fundamento) || undefined,
			materia: { name: String(flashcard.materia) },
			lei: { name: String(flashcard.lei) },
			favorite: !!flashcard.favorite,
		}))
	}
	const query = await prisma.$queryRaw<any[]>`
select f.id,
           f.frente,
           f.verso,
           f.fundamento,
           materias.name as materia,
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
       and exists (select 1 from "LeisOnCombos" loc
     	   		        where loc."leiId" = leis.id
     				          and loc."comboId" = ${comboId})
       and (select fua.answer from flashcard_user_answers fua
                        where fua."flashcardId" = f.id
                        and fua."userId" = ${userId}
                        order by fua."createdAt" desc
                       limit 1) = ${tipoQuery}           
    `
	return query.map(flashcard => ({
		id: String(flashcard.id),
		frente: String(flashcard.frente),
		verso: String(flashcard.verso),
		fundamento: String(flashcard.fundamento) || undefined,
		materia: { name: String(flashcard.materia) },
		lei: { name: String(flashcard.lei) },
		favorite: !!flashcard.favorite,
	}))
}
