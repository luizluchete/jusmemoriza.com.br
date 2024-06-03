import { type LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import { requireUserWithRole } from '#app/utils/permissions.server'
import { MateriaEditor } from './__materia-editor'

export { action } from './__materia-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	return json({})
}
export default MateriaEditor
