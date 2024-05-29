import { json } from '@remix-run/react'
import { MateriaEditor } from './__materia-editor'
import { requireUserWithRole } from '#app/utils/permissions.server.js'
import { LoaderFunctionArgs } from '@remix-run/node'

export { action } from './__materia-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	return json({})
}
export default MateriaEditor
