import { Link } from '@remix-run/react'
import { Fragment } from 'react'
import { cn } from '#app/utils/misc'

const locations = [
	{
		name: 'Edinburgh',
		people: [
			{
				name: 'Lindsay Walton',
				title: 'Front-end Developer',
				email: 'lindsay.walton@example.com',
				role: 'Member',
			},
			{
				name: 'Courtney Henry',
				title: 'Designer',
				email: 'courtney.henry@example.com',
				role: 'Admin',
			},
		],
	},
]

export default function Example() {
	return (
		<div className="px-4 sm:px-6 lg:px-8">
			<div className="sm:flex sm:items-center">
				<div className="sm:flex-auto">
					<h1 className="text-base font-semibold leading-6 text-gray-900">
						Produtos
					</h1>
					<p className="mt-2 text-sm text-gray-700">
						Lista de todos os produtos da plataforma, incluindo seus combos e
						informações da integração com a hotmart.
					</p>
				</div>
				<div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
					<Link to={'new'}>
						<button
							type="button"
							className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>
							Cadastrar produto
						</button>
					</Link>
				</div>
			</div>
			<div className="mt-8 flow-root">
				<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
						<table className="min-w-full">
							<thead className="bg-white">
								<tr>
									<th
										scope="col"
										className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
									>
										Produto
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Title
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Email
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Role
									</th>
									<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-3">
										<span className="sr-only">Edit</span>
									</th>
								</tr>
							</thead>
							<tbody className="bg-white">
								{locations.map(location => (
									<Fragment key={location.name}>
										<tr className="border-t border-gray-200">
											<th
												scope="colgroup"
												colSpan={5}
												className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
											>
												{location.name}
											</th>
										</tr>
										{location.people.map((person, personIdx) => (
											<tr
												key={person.email}
												className={cn(
													personIdx === 0
														? 'border-gray-300'
														: 'border-gray-200',
													'border-t',
												)}
											>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">
													{person.name}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{person.title}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{person.email}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
													{person.role}
												</td>
												<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-3">
													<Link
														to={person.name}
														className="text-indigo-600 hover:text-indigo-900"
													>
														Edit<span className="sr-only">, {person.name}</span>
													</Link>
												</td>
											</tr>
										))}
									</Fragment>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	)
}
