import { Link, Outlet } from '@remix-run/react'
import { Button } from '#app/components/ui/button'

export default function Index() {
	return (
		<>
			<Outlet />
			<div className="flex">
				<div>
					<Link to="new">
						<Button>Novo Flashcard</Button>
					</Link>
				</div>

				<div></div>
			</div>
		</>
	)
}
