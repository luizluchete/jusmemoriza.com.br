import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.js'
import { redirectWithToast } from '#app/utils/toast.server.js'
import { quizSchemaEditor } from './__quiz-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: quizSchemaEditor })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const {
		artigoId,
		comentario,
		enunciado,
		ano,
		bancaId,
		cargoId,
		fundamento,
		id,
		status,
		tags,
		verdadeiro,
	} = submission.value
	await prisma.quiz.upsert({
		where: { id: id ?? '__new__' },
		create: {
			enunciado,
			comentario,
			verdadeiro: verdadeiro ?? false,
			artigoId,
			cargoId,
			bancaId,
			ano,
			fundamento,
			tags,
			status: status ?? false,
		},
		update: {
			enunciado,
			comentario,
			verdadeiro: verdadeiro ?? false,
			artigoId,
			cargoId,
			bancaId,
			ano,
			fundamento,
			tags,
			status: status ?? false,
		},
	})
	return redirectWithToast(`/admin/quizzes`, {
		type: 'success',
		description: `Quiz ${id ? 'atualizado' : 'criado'} com sucesso`,
	})
}
