import { execaCommand } from 'execa'
// export const BASE_DATABASE_PATH = path.join(
// 	process.cwd(),
// 	`./tests/prisma/base.db`,
// )

export const BASE_DATABASE_PATH =
	'postgresql://postgres:postgres@localhost:5499/vitest?schema=public'

export async function setup() {
	// const databaseExists = await fsExtra.pathExists(BASE_DATABASE_PATH)

	// if (databaseExists) {
	// 	const databaseLastModifiedAt = (await fsExtra.stat(BASE_DATABASE_PATH))
	// 		.mtime
	// 	const prismaSchemaLastModifiedAt = (
	// 		await fsExtra.stat('./prisma/schema.prisma')
	// 	).mtime

	// 	if (prismaSchemaLastModifiedAt < databaseLastModifiedAt) {
	// 		return
	// 	}
	// }

	await execaCommand(
		'npx prisma migrate reset --force --skip-seed --skip-generate',
		{
			stdio: 'inherit',
			env: {
				...process.env,
				// DATABASE_URL: `file:${BASE_DATABASE_PATH}`,
				DATABASE_URL: `${BASE_DATABASE_PATH}`,
			},
		},
	)
}
