import { json, type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server'
import { getEnv } from '#app/utils/env.server.js'

const purchaseCompleteIntent = 'PURCHASE_COMPLETE'
const purchaseExpiredIntent = 'PURCHASE_EXPIRED'
const purchaseRefundedIntent = 'PURCHASE_REFUNDED'

const purchaseSchema = z.object({
	event: z.enum([
		purchaseCompleteIntent,
		purchaseExpiredIntent,
		purchaseRefundedIntent,
	]),
	creation_date: z.number().transform(value => new Date(value)),
	data: z.object({
		product: z.object({
			name: z.string(),
		}),
		buyer: z.object({
			email: z.string().email().toLowerCase(),
		}),
		purchase: z.object({
			approved_date: z.number().transform(value => new Date(value)),
			order_date: z.number().transform(value => new Date(value)),
			transaction: z.string(),
			status: z.enum(['COMPLETED', 'EXPIRED', 'REFUNDED']),
		}),
		subscription: z.object({
			plan: z.object({ name: z.string() }),
		}),
	}),
})

export async function action({ request }: ActionFunctionArgs) {
	const token = request.headers.get('x-hotmart-hottok')

	if (!token) {
		return json({ message: 'token not found' }, { status: 400 })
	}
	const env = getEnv()

	if (token !== env.HOTTOK_HOTMART) {
		return json({ message: 'invalid token' }, { status: 403 })
	}

	const data = await request.json()

	const result = purchaseSchema.safeParse(data)
	if (!result.success) {
		return json(
			{ message: 'invalid data', error: result.error },
			{ status: 400 },
		)
	}

	if (result.data.event === purchaseCompleteIntent) {
		return purchaseCompleteAction(result.data)
	}

	if (result.data.event === purchaseExpiredIntent) {
		return purchaseExpiredAction(result.data)
	}
	if (result.data.event === purchaseRefundedIntent) {
		return purchaseRefundedAction(result.data)
	}

	return json({ message: 'event not implemented' }, { status: 400 })
}

type PurchaseAction = z.infer<typeof purchaseSchema>
async function purchaseCompleteAction(data: PurchaseAction) {
	const { product, buyer, purchase, subscription } = data.data
	const exists = await prisma.purchasesUser.findFirst({
		where: { transactionHotmart: purchase.transaction, email: buyer.email },
	})

	if (!exists) {
		await prisma.purchasesUser.create({
			data: {
				email: buyer.email,
				transactionHotmart: purchase.transaction,
				name: product.name,
				plan: subscription.plan.name,
				productHotmart: product.name,
				status: purchase.status,
				purchaseAt: purchase.approved_date,
			},
		})
		return json({ message: 'order created' })
	}

	await prisma.purchasesUser.update({
		where: { id: exists.id },
		data: {
			email: buyer.email,
			transactionHotmart: purchase.transaction,
			name: product.name,
			plan: subscription.plan.name,
			productHotmart: product.name,
			status: purchase.status,
			purchaseAt: purchase.approved_date,
		},
	})
	return json({ message: 'order updated' })
}

async function purchaseExpiredAction(data: PurchaseAction) {
	const { buyer, purchase } = data.data
	const exists = await prisma.purchasesUser.findFirst({
		where: { transactionHotmart: purchase.transaction, email: buyer.email },
	})
	if (!exists) {
		return json({ error: 'transcation not found' }, { status: 400 })
	}

	await prisma.purchasesUser.update({
		where: { id: exists.id },
		data: {
			expiresAt: purchase.order_date,
			status: purchase.status,
		},
	})

	return json({ message: 'order updated(expired)' })
}

async function purchaseRefundedAction(data: PurchaseAction) {
	const { buyer, purchase } = data.data
	const exists = await prisma.purchasesUser.findFirst({
		where: { transactionHotmart: purchase.transaction, email: buyer.email },
	})
	if (!exists) {
		return json({ error: 'transcation not found' }, { status: 400 })
	}

	await prisma.purchasesUser.update({
		where: { id: exists.id },
		data: {
			refundedAt: data.creation_date,
			status: purchase.status,
		},
	})

	return json({ message: 'order updated(refunded)' })
}
