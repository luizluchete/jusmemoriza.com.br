import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.js'
import { redirectWithToast } from '#app/utils/toast.server'
import { flashcardSchemaEditor } from './__flashcard-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: flashcardSchemaEditor })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const {
		artigoId,
		fundamento,
		id,
		status,
		frente,
		verso,
		titulo,
		tipo,
		dificuldade,
	} = submission.value
	await prisma.flashcard.upsert({
		where: { id: id ?? '__new__' },
		create: {
			frente,
			verso,
			titulo,
			tipo,
			dificuldade,
			artigoId,
			fundamento,
			status: status ?? false,
		},
		update: {
			frente,
			verso,
			titulo,
			tipo,
			dificuldade,
			artigoId,
			fundamento,
			status: status ?? false,
		},
	})
	return redirectWithToast(`/admin/flashcards`, {
		type: 'success',
		description: `Flashcard ${id ? 'atualizado' : 'criado'} com sucesso`,
	})
}
