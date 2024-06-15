import { prisma } from "#app/utils/db.server";
import { getMonthName } from "#app/utils/misc";

export async function buscaResultadosQuizzesUltimos6M(userId:string):Promise<{mesAno:string, total:number, corretas:number}[]>{
    
    const result = await prisma.$queryRaw<
    { mes_ano: Date; total: number; corretas: number }[]
  >`
    select DATE_TRUNC('month', "createdAt") AS mes_ano,
           count(*) as total,
           sum(case when result = true then 1 else 0 end ) as corretas
      from quiz_user_results qur 
     where qur."userId" = ${userId}
       and qur."createdAt" >= CURRENT_DATE - INTERVAL '6 months'
     group by mes_ano
     order by mes_ano 
    `
    
    return result.map((value) => {
        const ano = new Date(value.mes_ano).getFullYear()
        return {
          mesAno: `${getMonthName(value.mes_ano.getMonth())}/${ano.toString()}`,
          total: Number(value.total),
          corretas: Number(value.corretas),
        }
      })
}


export async function buscaMateriasMaisRespondidas(userId:string){
    const take = 5

    const result = await prisma.$queryRaw<{id:string, nome:string, total:number}[]>`
    select materias.id as id, 
           materias.name as nome,
           count(*) as total
      from materias, 
           leis,
           titulos t,
           capitulos c,
           artigos, 
           quizzes, 
           quiz_user_results qr
     where materias.id = leis."materiaId"
       and leis.id = t."leiId"
       and t.id = c."tituloId" 
       and c.id = artigos."capituloId" 
       and artigos.id = quizzes."artigoId"
       and quizzes.id = qr."quizId"
       and materias.status = true
       and leis.status = true
       and artigos.status = true
       and quizzes.status = true
       and c.status  = true 
       and t.status  = true
       and qr."userId" = ${userId}
     group by materias.id, 
              materias.name
              `

const total = result.reduce((acc, value) => acc + Number(value.total), 0)
return result
    .map((value) => ({
      id: value.id,
      nome: value.nome,
      total: Number(value.total),
      percentual: (Number(value.total) / total) * 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, take)
}

export async function buscaResultadosMesAtual(userId:string){

  const result = await prisma.$queryRaw<
  {total: number; corretas: number }[]
>`
  select count(*) as total,
         sum(case when result = true then 1 else 0 end ) as corretas
    from quiz_user_results 
   where "userId" = ${userId}
     and EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM CURRENT_DATE)
     and EXTRACT(MONTH FROM "createdAt") = EXTRACT(MONTH FROM CURRENT_DATE) 
  `
  if(result.length === 0){
    return { total: 0, corretas: 0 }
  }
  return {
    total: Number(result[0].total),
    corretas: Number(result[0].corretas),
  }  
}