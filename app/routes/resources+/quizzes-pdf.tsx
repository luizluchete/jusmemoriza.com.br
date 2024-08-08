import {
	Page,
	Text,
	View,
	Document,
	StyleSheet,
	renderToBuffer,
	Image,
} from '@react-pdf/renderer'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const quizzesId = url.searchParams.getAll('quizId')
	const quizzes = await prisma.quiz.findMany({
		select: {
			id: true,
			ano: true,
			banca: { select: { name: true } },
			cargo: { select: { name: true } },
			artigo: {
				select: {
					name: true,
					capitulo: {
						select: {
							titulo: {
								select: {
									lei: {
										select: { name: true, materia: { select: { name: true } } },
									},
								},
							},
						},
					},
				},
			},
			enunciado: true,
			comentario: true,
			fundamento: true,
			verdadeiro: true,
		},
		where: { id: { in: quizzesId }, status: true },
	})

	const pdf = await renderToBuffer(<MyDocument quizzes={quizzes} />)

	return new Response(pdf, {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
		},
	})
}

// Create styles
const primaryColor = '#32297C'

const styles = StyleSheet.create({
	textHeader: {
		fontSize: 8,
	},
	page: {
		flexDirection: 'column',
		margin: 10,
	},
	headerQuiz: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		fontSize: 14,
		color: primaryColor,
		fontWeight: 'bold',
	},
	viewEnunciado: { marginHorizontal: 25, marginVertical: 15 },
	textEnunciado: {
		textAlign: 'justify',
		fontSize: 12,
	},
	viewAlternativas: { marginHorizontal: 25, fontSize: 12, marginBottom: 10 },
})

// Create Document Component
const MyDocument = ({ quizzes }: any) => (
	<Document title="Quizzes | Jusmemoriza" author="jusmemoriza">
		<Page size="A4" style={styles.page}>
			<View fixed>
				<Text style={styles.textHeader}>
					{new Date().toLocaleString('pt-BR', {
						timeZone: 'America/Sao_Paulo',
					})}
				</Text>
				<Image
					src="public/img/logo_primary.png"
					style={{
						height: 50,
						objectFit: 'contain',
					}}
				/>
			</View>
			{quizzes.map((quiz: any, index: number) => (
				<View key={quiz.id} wrap={false}>
					<View style={styles.headerQuiz}>
						<View
							style={{
								width: 20,
								height: 20,
								borderWidth: 1,
								borderColor: primaryColor,
								justifyContent: 'center',
								alignItems: 'center',
								borderRadius: 5,
								marginRight: 5,
							}}
						>
							<Text>{index + 1}</Text>
						</View>
						<View
							style={{
								flexDirection: 'row',
							}}
						>
							<Text
								style={{
									textAlign: 'justify',
									textOverflow: 'ellipsis',
									marginRight: 50,
								}}
							>
								<Text>{quiz.artigo.capitulo.titulo.lei.materia.name} - </Text>
								<Text>{quiz.artigo.capitulo.titulo.lei.name} </Text>
								<Text>{quiz.ano ? ` ${quiz.ano}` : ''}</Text>
								<Text>{quiz.banca ? `  ${quiz.banca.name}` : ''}</Text>
								<Text>{quiz.cargo ? ` ${quiz.cargo.name}` : ''}</Text>
							</Text>
						</View>
					</View>
					<View style={styles.viewEnunciado}>
						<Text style={styles.textEnunciado}>{quiz.enunciado}</Text>
					</View>

					<View style={styles.viewAlternativas}>
						<Text>( ) Verdadeiro </Text>
						<Text>( ) Falso </Text>
					</View>
				</View>
			))}
			<Text
				style={{
					position: 'absolute',
					bottom: 30,
					left: 0,
					right: 30,
					textAlign: 'right',
					fontSize: 8,
				}}
				render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
				fixed
			/>
		</Page>
	</Document>
)
