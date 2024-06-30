import { prisma } from './db.server'

export async function getGlobalParams() {
	const configs = await prisma.config.findFirst({
		select: { notifyEmail: true },
	})
	return configs
}
