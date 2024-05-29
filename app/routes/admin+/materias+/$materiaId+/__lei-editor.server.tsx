import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import { prisma } from '#app/utils/db.server'
import { redirectWithToast } from '#app/utils/toast.server.js'
import { leiSchemaEditor } from './__lei-editor'

export async function action({ request, params }: ActionFunctionArgs) {
	const materiaId = params.materiaId
	invariantResponse(materiaId, 'Not found', { status: 404 })
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: leiSchemaEditor })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { nome, id, status } = submission.value
	await prisma.lei.upsert({
		where: { id: id ?? '__new__' },
		create: {
			name: nome,
			status: status ?? false,
			materiaId: materiaId,
		},
		update: {
			name: nome,
			status: status ?? false,
		},
	})
	return redirectWithToast(`/admin/materias/${materiaId}/leis`, {
		type: 'success',
		description: `Lei ${id ? 'atualizada' : 'criada'} com sucesso`,
	})
}
