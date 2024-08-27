import { Prisma } from '@prisma/client'
import { getGlobalParams } from '#app/utils/config.server'
import { prisma } from '#app/utils/db.server'
import { sendEmail } from '#app/utils/email.server'

type Input = {
	tipo?: string
	page?: number
	userId: string
	comboId: string
	onlyFavorites?: boolean
	materiaId?: string[]
	leiId?: string[]
	tituloId?: string[]
	capituloId?: string[]
	artigoId?: string[]
}

export async function buscaRatingDoCombo(comboId: string, userId: string) {
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
         sum(case (select fua.answer from flashcard_user_answers fua
                    where fua."flashcardId" = f.id
                      and fua."userId" = ${userId}
                    order by fua."createdAt" desc
                    limit 1) when 'sabia' then 1 else 0 end) sabia
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
	and not exists (select 1 from "FlashcardIgnore" 
		where "FlashcardIgnore"."flashcardId" = f.id
		  and "FlashcardIgnore"."userId" = ${userId})
                     
`
	return (Number(query[0].sabia) / Number(query[0].total)) * 100
}

export async function countFlashcards({
	comboId,
	userId,
	artigoId,
	capituloId,
	leiId,
	materiaId,
	onlyFavorites,
	page,
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

	const whereFavorite = onlyFavorites
		? Prisma.sql`and exists (select 1 from "FlashcardUserFavorites" fuf
                                                                where fuf."flashcardId" = f.id
                                                                  and fuf."userId" = ${userId})`
		: Prisma.empty

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
      ${whereMateria}
       ${whereLei}
       ${whereTitulo}
       ${whereCapitulo}
       ${whereArtigo}
       ${whereFavorite}
	   and not exists (select 1 from "FlashcardIgnore" 
		where "FlashcardIgnore"."flashcardId" = f.id
		  and "FlashcardIgnore"."userId" = ${userId})
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

export async function buscarFlashcards({
	comboId,
	userId,
	tipo,
	materiaId,
	artigoId,
	capituloId,
	leiId,
	onlyFavorites,
	tituloId,
	page = 1,
}: Input) {
	let tipoQuery = tipo
	if (tipo !== 'know' && tipo !== 'doubt' && tipo !== 'noknow') {
		tipoQuery = 'initial'
	}

	if (tipo === 'know') {
		tipoQuery = 'sabia'
	} else if (tipo === 'doubt') {
		tipoQuery = 'duvida'
	} else if (tipo === 'noknow') {
		tipoQuery = 'nao_sabia'
	}

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

	const whereFavorite = onlyFavorites
		? Prisma.sql`and exists (select 1 from "FlashcardUserFavorites" fuf
                                                                where fuf."flashcardId" = f.id
                                                                  and fuf."userId" = ${userId})`
		: Prisma.empty
	const whereIgnoreFlashcard = Prisma.sql`and not exists (select 1 from "FlashcardIgnore" 
														where "FlashcardIgnore"."flashcardId" = f.id
														  and "FlashcardIgnore"."userId" = ${userId})`
	if (tipoQuery === 'initial') {
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
       ${whereTitulo}
       ${whereCapitulo}
       ${whereArtigo}
       ${whereFavorite}
	   ${whereIgnoreFlashcard}
       and exists (select 1 from "LeisOnCombos" loc
     	   		        where loc."leiId" = leis.id
     				          and loc."comboId" = ${comboId})
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
       ${whereTitulo}
       ${whereCapitulo}
       ${whereArtigo}
       ${whereFavorite}
	   ${whereIgnoreFlashcard}
       and exists (select 1 from "LeisOnCombos" loc
     	   		        where loc."leiId" = leis.id
     				          and loc."comboId" = ${comboId})
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

export async function notifyErrorFlashcard(
	flashcardId: string,
	userId: string,
	message: string,
) {
	const configs = await getGlobalParams()
	if (configs && configs.notifyEmail) {
		const notifyEmail = configs.notifyEmail
		const user = await prisma.user.findFirst({
			select: { name: true, email: true },
			where: { id: userId },
		})
		if (!user) return false
		const flashcard = await prisma.flashcard.findFirst({
			where: { id: flashcardId },
		})
		await prisma.notifyError.create({
			data: { userMessage: message, flashcardId, userId },
		})
		const response = await sendEmail({
			subject: 'Erro em FLASHCARD reportado por usuário',
			to: notifyEmail,
			react: (
				<div>
					<h1>Erro em FLASHCARD reportado por usuário</h1>
					<p>
						Usuário: {user.name} ({user.email})
					</p>
					<p>Mensagem: {message}</p>
					<p>frente: {flashcard?.frente}</p>
					<p>verso: {flashcard?.verso}</p>
					<p>fundamento: {flashcard?.fundamento}</p>
					<p>foi incluido no sistema para verificação !</p>
				</div>
			),
		})

		if (response.status === 'success') {
			return true
		}
	}
	return false
}
