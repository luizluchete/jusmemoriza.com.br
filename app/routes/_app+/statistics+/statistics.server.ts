import { prisma } from '#app/utils/db.server'

export async function buscaTotalizadorQuizzes(
	userId: string,
): Promise<{ total: number; corretas: number; erradas: number }> {
	const [total, corretas] = await Promise.all([
		prisma.quizUserResults.count({ where: { userId } }),
		prisma.quizUserResults.count({ where: { userId, result: true } }),
	])

	return {
		corretas,
		erradas: total - corretas,
		total,
	}
}

export async function buscaTotalizadorQuizzesPorMateria(
	userId: string,
	materiaId?: string,
) {
	if (materiaId) {
		const result = await prisma.$queryRaw<
			{ id: string; name: string; total: number; corretas: number }[]
		>`
        select l.id, 
               l.name, 
               count(*) as total,
               sum(case when qr."result" = true then 1 else 0 end) as corretas
          from quiz_user_results  qr, quizzes q, artigos a, titulos t ,capitulos c , leis l, materias m
         where qr."quizId" = q.id
           and q."artigoId" = a.id 
           and a."capituloId" = c.id
           and c."tituloId" = t.id 
           and t."leiId" = l.id
           and l."materiaId" = m.id 
           and qr."userId" = ${userId}
           and m.id = ${materiaId}
      group by l.id, l.name
    `
		return result.map(({ corretas, id, name, total }) => ({
			id,
			name,
			total: Number(total),
			corretas: Number(corretas),
			erradas: Number(total) - Number(corretas),
		}))
	}

	const result = await prisma.$queryRaw<
		{ id: string; name: string; total: number; corretas: number }[]
	>`
        select m.id, 
               m.name, 
               count(*) as total,
               sum(case when qr."result" = true then 1 else 0 end) as corretas
          from quiz_user_results  qr, quizzes q, artigos a, titulos t ,capitulos c , leis l, materias m
         where qr."quizId" = q.id
           and q."artigoId" = a.id 
           and a."capituloId" = c.id
           and c."tituloId" = t.id 
           and t."leiId" = l.id
           and l."materiaId" = m.id 
           and qr."userId" = ${userId}
      group by m.id, m.name
    `

	return result.map(({ corretas, id, name, total }) => ({
		id,
		name,
		total: Number(total),
		corretas: Number(corretas),
		erradas: Number(total) - Number(corretas),
	}))
}

export async function quantidadeTotalRespondidaPorMateria(
	userId: string,
	materiaId?: string,
) {
	const [total, corretas] = await Promise.all([
		prisma.quizUserResults.count({
			where: {
				userId,
				quiz: materiaId
					? { artigo: { capitulo: { titulo: { lei: { materiaId } } } } }
					: undefined,
			},
		}),
		prisma.quizUserResults.count({
			where: {
				userId,
				result: true,
				quiz: materiaId
					? { artigo: { capitulo: { titulo: { lei: { materiaId } } } } }
					: undefined,
			},
		}),
	])
	return { total, corretas, erradas: total - corretas }
}

export async function statisticsFlashcards(userId: string) {
	const query = await prisma.$queryRaw<
		{ total: number; sabia: number; duvida: number; naoSabia: number }[]
	>`
	SELECT count(flashcards.id) total,
       sum(CASE
                      (SELECT fua.answer
                       FROM flashcard_user_answers fua
                       WHERE fua."flashcardId" = flashcards.id
                         AND fua."userId" = flashcards."userId"
                       ORDER BY fua."createdAt" DESC
                       LIMIT 1)
               WHEN 'sabia' THEN 1
               ELSE 0
           END) sabia,
       sum(CASE
                      (SELECT fua.answer
                       FROM flashcard_user_answers fua
                       WHERE fua."flashcardId" = flashcards.id
                         AND fua."userId" = flashcards."userId"
                       ORDER BY fua."createdAt" DESC
                       LIMIT 1)
               WHEN 'duvida' THEN 1
               ELSE 0
           END) duvida,
       sum(CASE
                      (SELECT fua.answer
                       FROM flashcard_user_answers fua
                       WHERE fua."flashcardId" = flashcards.id
                         AND fua."userId" = flashcards."userId"
                       ORDER BY fua."createdAt" DESC
                       LIMIT 1)
               WHEN 'nao_sabia' THEN 1
               ELSE 0
           END) "naoSabia"
FROM
  (SELECT fua."flashcardId" AS id,
          fua."userId"
   FROM flashcard_user_answers fua
   WHERE fua."userId" = ${userId}
   GROUP BY fua."flashcardId",
            fua."userId") flashcards
	
	
	`

	if (query.length === 0) {
		return {
			total: 0,
			sabia: 0,
			duvida: 0,
			naoSabia: 0,
		}
	}

	return {
		total: Number(query[0].total),
		sabia: Number(query[0].sabia),
		duvida: Number(query[0].duvida),
		naoSabia: Number(query[0].naoSabia),
	}
}
