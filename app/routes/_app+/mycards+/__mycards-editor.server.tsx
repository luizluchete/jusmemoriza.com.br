import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { schemaMyFlashcard } from './__mycards-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)
	const submission = parseWithZod(formData, { schema: schemaMyFlashcard })
	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}

	const { leiId, frente, verso, lists, id } = submission.value
	if (id) {
		await prisma.userFlashcard.update({
			where: { id },
			data: {
				frente,
				verso,
				leiId,
				ListsUsersMyFlashcards: {
					deleteMany: {},
					create: lists?.map(id => ({ listId: id })),
				},
			},
		})
		return redirectWithToast('/mycards', {
			description: 'Flashcard atualizado com sucesso',
		})
	}

	await prisma.userFlashcard.create({
		data: {
			frente,
			verso,
			leiId,
			userId: userId,
			ListsUsersMyFlashcards: {
				create: lists?.map(id => ({ listId: id })),
			},
		},
	})
	return redirectWithToast('/mycards', {
		description: 'Flashcard criado com sucesso',
	})
}
