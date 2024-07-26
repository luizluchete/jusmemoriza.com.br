import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { productSchema } from './__product-editor'
export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const userId = await requireUserId(request)

	const result = parseWithZod(formData, { schema: productSchema })
	if (result.status !== 'success') {
		return json({ result: result.reply() }, { status: 400 })
	}
	try {
		const { description, name, hotmartId, hotmartLink } = result.value
		const product = await prisma.product.create({
			data: {
				name,
				description,
				hotmartLink,
				productIdHotmart: hotmartId,
				createdById: userId,
			},
		})

		return redirect(`/admin/products/${product.id}`)
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
