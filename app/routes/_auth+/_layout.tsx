import { Outlet } from '@remix-run/react'
import backgroundImage from '#app/components/ui/img/background_login.svg'
import logoBranco from '#app/components/ui/img/logo_jusmemoriza_branco.png'
import logoLight from '#app/components/ui/img/logo_jusmemoriza_light.png'

export default function LayoutAuth() {
	return (
		<>
			<div className="flex min-h-full bg-primary">
				<div className="relative hidden w-0 flex-1 lg:block ">
					<img
						object-fit="cover"
						className="absolute inset-0 h-full w-full object-cover"
						src={backgroundImage}
						alt="background login"
					/>
					<div className=" flex min-h-full flex-col items-start pt-40">
						<img
							src={logoBranco}
							height={300}
							width={900}
							alt="Logo JusMemoriza"
						/>

						<section className="pl-20 pr-40 xl:pl-40 xl:pr-72">
							<h2 className="text-2xl font-normal text-white">
								Descubra hoje a melhor maneira de PASSAR NOS MAIS DIVERSOS
								CONCURSOS PÚBLICOS estudando de maneira simples, rápida e
								prática.
							</h2>
						</section>
					</div>
				</div>
				<div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-white px-3 py-12 sm:px-5 lg:min-w-[697px] lg:flex-none lg:px-14 xl:px-20">
					<div className="flex h-3/4 w-full flex-col  justify-center ">
						<div className="flex min-h-full flex-col justify-center">
							<div className="mx-auto w-full max-w-md px-8">
								<div className="mt-5">
									<Outlet />
									<div className="flex justify-center">
										<img
											src={logoLight}
											height="100"
											width="300"
											alt="Logo JusMemoriza"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
