import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { productSchema } from './__product-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)

	const result = parseWithZod(formData, { schema: productSchema })
	if (result.status !== 'success') {
		return json({ result: result.reply() }, { status: 400 })
	}
	try {
		const { description, name, hotmartId, hotmartLink, id } = result.value
		const product = await prisma.product.upsert({
			where: { id: id ?? '__new__' },
			create: {
				name,
				description,
				hotmartLink,
				productIdHotmart: hotmartId,
				createdById: userId,
			},
			update: {
				name,
				description,
				hotmartLink,
				productIdHotmart: hotmartId,
				createdById: userId,
			},
		})

		return redirectWithToast(`/admin/products/${product.id}`, {
			description: `Produto ${id ? 'atualizado' : 'criado'} com sucesso`,
		})
	} catch (error) {
		console.error(error)
		return json(
			{
				result: result.reply({
					formErrors: ['Erro ao salvar produto - fale com o suporte'],
				}),
			},
			{ status: 400 },
		)
	}
}
