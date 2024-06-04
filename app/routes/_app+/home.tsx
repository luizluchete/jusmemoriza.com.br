import { type MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => [
	{
		title: 'Inicio | JusMemoriza',
	},
]

export default function () {
	return <h1>home</h1>
}
