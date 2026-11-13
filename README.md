# GG Análises Esportivas

Plataforma de análise esportiva pré-jogo, registro manual de entradas e acompanhamento de resultados.

## Funcionamento atual

- Site estático publicado pelo GitHub Pages, sem servidor próprio ou conta Cloudflare.
- Catálogo de partidas futuras consultado diretamente nos feeds públicos e não oficiais da ESPN.
- Cinco especialistas executados separadamente por um modelo de linguagem local no navegador.
- Um sexto agente recebe os cinco relatórios concluídos e consolida divergências e decisão.
- A IA local utiliza WebLLM e modelos Qwen 2.5. O modelo maior é selecionado em aparelhos com mais memória; aparelhos com menos memória tentam o modelo compacto.
- O modelo é baixado na primeira utilização e fica armazenado em cache pelo navegador.
- O processamento de IA acontece no aparelho. Não há chave de API nem cobrança de inferência por chamada.
- Registro manual de entradas, histórico, estatísticas e simulador permanecem no navegador.

## Requisitos e limitações

- Navegador compatível com WebGPU. Chrome atualizado é a opção recomendada.
- Espaço livre e conexão para baixar o modelo na primeira utilização. O tamanho depende do modelo selecionado.
- A disponibilidade de WebGPU e memória varia por aparelho. Dispositivos incompatíveis não conseguem executar a análise local.
- Os feeds da ESPN são endpoints públicos não oficiais, sem garantia de disponibilidade ou cobertura.
- Os dados disponíveis podem não conter histórico detalhado, escalações ou odds de casas. O sistema deve declarar essas lacunas e não inventar números.
- Odds só podem fundamentar valor esperado quando a cotação, a fonte e o horário estiverem efetivamente disponíveis. Sem isso, a decisão deve ser **NÃO ENTRAR**.
- Modelos locais compactos podem errar ou interpretar dados incorretamente. Toda análise precisa ser conferida nas fontes originais e não representa garantia de resultado.

## Módulos

- Futebol e basquete, com seleção de competição e partida.
- Cinco especialistas: histórico e dados, probabilidades, mercados, odds e valor, escalações e notícias.
- IA chefe para confrontar os relatórios e consolidar a decisão.
- Registro manual de entradas com Green, Red, Anulado e Cashout.
- Estatísticas de taxa de acerto, ROI e lucro/prejuízo.
- Simulador de progressão hipotética.

## Estrutura

- `index.html`: interface.
- `css/style.css`: estilos responsivos.
- `js/app.js`: navegação, feeds, análise e registros.
- `js/local-ai.js`: execução local do modelo por WebLLM.

## Privacidade

O modelo de IA e os prompts de análise são processados no navegador. As consultas de partidas e notícias são enviadas diretamente aos serviços públicos da ESPN. Os registros manuais permanecem no armazenamento local do navegador e não sincronizam entre dispositivos.
