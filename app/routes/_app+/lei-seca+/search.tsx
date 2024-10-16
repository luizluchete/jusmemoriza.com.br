import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const searchMaterias = url.searchParams.getAll('materia')
	const searchLeis = url.searchParams.getAll('lei')
	const searchTitulos = url.searchParams.getAll('titulo')
	const searchCapitulos = url.searchParams.getAll('capitulo')

	const materias = await prisma.materia.findMany()
	const leis = searchMaterias
		? await prisma.lei.findMany({
				select: { id: true, name: true },
				where: {
					materiaId: {
						in: searchMaterias,
					},
					titulos: {
						some: {
							capitulos: {
								some: {
									artigos: { some: { quizzes: { some: { status: true } } } },
								},
							},
						},
					},
				},
			})
		: []

	const titulos = searchLeis
		? await prisma.titulo.findMany({
				select: { id: true, name: true },
				where: {
					leiId: {
						in: searchLeis,
					},
					capitulos: {
						some: {
							artigos: { some: { quizzes: { some: { status: true } } } },
						},
					},
				},
			})
		: []

	const capitulos = searchTitulos
		? await prisma.capitulo.findMany({
				select: { id: true, name: true },
				where: {
					tituloId: {
						in: searchTitulos,
					},
					artigos: { some: { quizzes: { some: { status: true } } } },
				},
			})
		: []

	const artigos = searchCapitulos
		? await prisma.artigo.findMany({
				select: { id: true, name: true },
				where: {
					capituloId: {
						in: searchCapitulos,
					},
					quizzes: { some: { status: true } },
				},
			})
		: []

	const bancas = searchMaterias
		? await prisma.banca.findMany({
				select: { id: true, name: true },
				where: { status: true, quizzes: { some: { status: true } } },
			})
		: []
	const cargos = searchMaterias
		? await prisma.cargo.findMany({
				select: { id: true, name: true },
				where: { status: true, quizzes: { some: { status: true } } },
			})
		: []
	return json({ materias, leis, bancas, cargos, titulos, capitulos, artigos })
}
