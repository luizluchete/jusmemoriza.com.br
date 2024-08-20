import { parseWithZod } from '@conform-to/zod'
import { json } from '@remix-run/react'
import { z } from 'zod'
import { schemaUserListFlashcard } from '#app/components/ui/__user-list-flashcards-editor'
import { prisma } from '../db.server'

export async function userListFlashcardAction(
	formData: FormData,
	userId: string,
) {
	const submission = await parseWithZod(formData, {
		schema: schemaUserListFlashcard.superRefine(async (data, ctx) => {
			const exists = await prisma.listsUser.findFirst({
				where: {
					userId,
					name: { equals: data.name, mode: 'insensitive' },
					id: { not: { equals: data.id } },
				},
			})
			if (exists) {
				ctx.addIssue({
					path: ['nome'],
					code: z.ZodIssueCode.custom,
					message: 'Você já tem uma lista com esse nome',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { color, icon, name, id } = submission.value
	await prisma.listsUser.upsert({
		where: { id: id ?? '__new__', userId },
		create: {
			name,
			color,
			icon,
			userId,
		},
		update: {
			name,
			color,
			icon,
		},
	})
	return json({ result: submission.reply() })
}
