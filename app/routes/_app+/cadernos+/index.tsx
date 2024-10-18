import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const cadernos = await prisma.caderno.findMany({
		select: { id: true, name: true, _count: { select: { cadernoQuiz: true } } },
		where: { userId },
	})
	const mapper = cadernos.map(caderno => ({
		id: caderno.id,
		name: caderno.name,
		quizCount: caderno._count.cadernoQuiz,
	}))
	return json({ cadernos: mapper })
}

export default function Index() {
	const { cadernos } = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	return (
		<div className="flex w-full flex-col justify-center">
			<h3 className="text-center text-h3">Seus Cadernos</h3>
			<h6 className="text-center text-sm text-gray-500">
				Escolha algum caderno para rever as questões adaptadas !
			</h6>

			{cadernos.length ? (
				<ul className="mt-5 flex flex-col gap-2">
					{cadernos.map(caderno => (
						<li
							key={caderno.id}
							className="flex cursor-pointer items-center justify-between rounded-md border border-gray-200 p-3 transition-all hover:bg-gray-200"
							onClick={() => navigate(`/lei-seca?caderno=${caderno.id}`)}
						>
							<span>{caderno.name}</span>
							<span>
								{caderno.quizCount}{' '}
								{caderno.quizCount > 1 ? 'Questões' : 'Questão'}
							</span>
						</li>
					))}
				</ul>
			) : (
				<span className="mt-5 text-center">Você ainda não tem cadernos</span>
			)}
		</div>
	)
}
