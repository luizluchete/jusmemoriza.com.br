import puppeteer from 'puppeteer'
export async function pdfQuiz() {
	const browser = await puppeteer.launch()
	const page = await browser.newPage()

	const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Relatório Financeiro</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
      }
      .header {
        text-align: center;
        margin-bottom: 40px;
      }
      .section {
        margin-bottom: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      table, th, td {
        border: 1px solid black;
      }
      th, td {
        padding: 10px;
        text-align: left;
      }
      .total {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Relatório Financeiro</h1>
      <p>Data: ${new Date().toLocaleDateString()}</p>
    </div>
    <div class="section">
      <h2>Receitas</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Venda de Produto A</td>
            <td>1,000.00</td>
          </tr>
          <tr>
            <td>Serviço B</td>
            <td>500.00</td>
          </tr>
          <tr class="total">
            <td>Total</td>
            <td>1,500.00</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2>Despesas</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Aluguel</td>
            <td>700.00</td>
          </tr>
          <tr>
            <td>Material de Escritório</td>
            <td>200.00</td>
          </tr>
          <tr class="total">
            <td>Total</td>
            <td>900.00</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2>Resumo</h2>
      <p>Receitas Totais: R$ 1,500.00</p>
      <p>Despesas Totais: R$ 900.00</p>
      <p><strong>Saldo: R$ 600.00</strong></p>
    </div>
  </body>
  </html>
`

	await page.setContent(htmlContent)
	const pdf = await page.pdf({
		path: `quizzes-${new Date().toISOString()}.pdf`,
		format: 'A4',
	})
	await browser.close()
	return pdf
}
