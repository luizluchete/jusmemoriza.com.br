import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { ComboFormSchema } from './__combo-editor'

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()

	const submission = parseWithZod(formData, { schema: ComboFormSchema })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { intent } = submission.value

	if (intent === 'submit') {
		const { nome, id, status, urlHotmart, color, description } =
			submission.value
		const combo = await prisma.combo.upsert({
			where: { id: id ?? '__new__' },
			create: {
				name: nome,
				status: status ?? false,
				color,
				description,
				urlHotmart,
			},
			update: {
				name: nome,
				color,
				description,
				status: status ?? false,
				urlHotmart,
			},
		})
		return redirectWithToast(`/admin/combos/${combo.id}`, {
			type: 'success',
			description: `Combo ${id ? 'atualizado' : 'criado'} com sucesso`,
		})
	}

	if (intent === 'delete') {
		const comboId = params.comboId
		invariantResponse(comboId, 'Combo não encontrado')
		const { leiId } = submission.value
		await prisma.leisOnCombos.delete({
			where: { comboId_leiId: { comboId, leiId } },
		})
		return redirectWithToast(`/admin/combos/${comboId}`, {
			type: 'success',
			description: 'Lei removida com sucesso',
		})
	}

	if (intent === 'add') {
		const comboId = params.comboId
		invariantResponse(comboId, 'Combo não encontrado')
		const { leiId } = submission.value
		await prisma.leisOnCombos.upsert({
			where: { comboId_leiId: { comboId, leiId } },
			create: {
				comboId,
				leiId,
			},
			update: {},
		})
		return redirectWithToast(`/admin/combos/${comboId}`, {
			type: 'success',
			description: 'Lei adicionada com sucesso',
		})
	}
}
