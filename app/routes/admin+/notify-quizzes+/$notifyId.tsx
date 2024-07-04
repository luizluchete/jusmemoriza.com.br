import { useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { Button } from '#app/components/ui/button'
import { prisma } from '#app/utils/db.server'

const schemaForm = z.object({
	fixedMessage: z.string().min(10).max(500),
})

export async function loader({ params }: LoaderFunctionArgs) {
	const { notifyId } = params
	invariantResponse(notifyId, 'notifyId is required', { status: 404 })
	const notify = await prisma.notifyErrorQuiz.findFirst({
		select: {
			id: true,
			fixed: true,
			fixedMessage: true,
			fixedBy: { select: { id: true, name: true } },
			user: { select: { name: true, email: true } },
			userMessage: true,
			quiz: {
				select: {
					id: true,
					fundamento: true,
					enunciado: true,
					comentario: true,
					banca: { select: { name: true } },
					cargo: { select: { name: true } },
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
				},
			},
			createdAt: true,
		},
		where: { id: notifyId },
	})
	invariantResponse(notify, 'notify not found', { status: 404 })

	return json({ notify })
}
export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const values = Object.fromEntries(formData)
	return json({ values })
}

export default function NotifyId() {
	const { notify } = useLoaderData<typeof loader>()

	const [] = useForm({
		onValidate: ({ formData }) => {
			return parseWithZod(formData, { schema: schemaForm })
		},
	})
	return (
		<div className="space-y-5">
			<div className="border p-2">
				<span>
					Criado em{' '}
					<span className="font-bold">
						{new Date(notify.createdAt).toLocaleDateString()} -{' '}
						{new Date(notify.createdAt).toLocaleTimeString()}
					</span>
				</span>
				<h1>
					Usuario:
					<span className="ml-1 font-bold">
						{notify.user.name} - {notify.user.email}
					</span>
				</h1>
			</div>

			<div>
				<h2 className="font-bold">Mensagem do Usuário</h2>
				<div className="rounded-md border p-2 shadow-md">
					<p>{notify.userMessage}</p>
				</div>
			</div>
			<hr />
			<div className="space-y-2">
				<div className="flex items-center space-x-4">
					<h2 className="h-full font-semibold">Informações do Quiz</h2>
					<Link to={`/admin/quizzes/${notify.quiz.id}/edit`} target="_black">
						<Button>Abrir Quiz</Button>
					</Link>
				</div>
				<div>
					<div>
						Matéria:{' '}
						<span className="font-semibold">
							{notify.quiz.artigo.capitulo.titulo.lei.materia.name}
						</span>
					</div>
					<div>
						Lei:{' '}
						<span className="font-semibold">
							{notify.quiz.artigo.capitulo.titulo.lei.name}
						</span>
					</div>

					<div>
						Título:{' '}
						<span className="font-semibold">
							{notify.quiz.artigo.capitulo.titulo.name}
						</span>
					</div>

					<div>
						Capítulo:{' '}
						<span className="font-semibold">
							{notify.quiz.artigo.capitulo.name}
						</span>
					</div>
					<div>
						Artigo:{' '}
						<span className="font-semibold">{notify.quiz.artigo.name}</span>
					</div>
				</div>
				<div>
					<div>
						<h3 className="font-semibold">Enunciado:</h3>
						<div className="rounded-md border p-2 shadow-md">
							<p dangerouslySetInnerHTML={{ __html: notify.quiz.enunciado }} />
						</div>
					</div>
					<div>
						<h3 className="font-semibold">Comentário:</h3>
						<div className="rounded-md border p-2 shadow-md">
							<p dangerouslySetInnerHTML={{ __html: notify.quiz.comentario }} />
						</div>
					</div>
					{notify.quiz.fundamento ? (
						<div>
							<h3 className="font-semibold">Fundamento:</h3>
							<div className="rounded-md border p-2 shadow-md">
								<p
									dangerouslySetInnerHTML={{ __html: notify.quiz.fundamento }}
								/>
							</div>
						</div>
					) : null}
				</div>
			</div>
			<div>
				Status:{' '}
				<span className={`${notify.fixed ? 'text-green-500' : 'text-red-500'}`}>
					{notify.fixed ? 'Corrigido' : 'Não Corrigido'}
				</span>
				{notify.fixedBy ? (
					<div>
						<h3 className="font-semibold">Corrigido por:</h3>
						<div className="rounded-md border p-2 shadow-md">
							<p>{notify.fixedBy.name}</p>
						</div>
						<h3 className="font-semibold">Mensagem do Corrigido:</h3>
						<div className="rounded-md border p-2 shadow-md">
							<p>{notify.fixedMessage}</p>
						</div>
					</div>
				) : null}
				{!notify.fixed ? (
					<>
						<Form method="post">
							<Button type="submit" className="bg-green-600 hover:bg-green-500">
								Marcar como Resolvido
							</Button>
						</Form>
					</>
				) : null}
			</div>
		</div>
	)
}
