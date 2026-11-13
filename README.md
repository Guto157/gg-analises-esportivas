# GG Análises Esportivas

Plataforma de apoio à análise esportiva pré-jogo, registro manual de entradas e acompanhamento de resultados.

## Estado atual

Esta primeira entrega publica a estrutura visual responsiva e os módulos locais de registro, histórico, estatísticas e simulação de progressão.

**Ainda não existem agentes de IA conectados, pesquisa web automatizada, feed de partidas, cotações em tempo real ou backend.** A tela de análise permanece desativada para não apresentar dados inventados como reais.

## Módulos previstos

- Futebol e basquete, com seleção de competição e partida.
- Cinco agentes especialistas com pesquisa independente e fontes verificáveis.
- Um agente coordenador que confronta os relatórios e pode concluir **NÃO ENTRAR**.
- Histórico das análises.
- Registro manual de entradas com Green, Red, Anulado e Cashout.
- Estatísticas de taxa de acerto, ROI, lucro/prejuízo e desempenho.
- Simulador de progressão hipotética.

## Arquitetura e segurança

O frontend pode ser hospedado como site estático. As chamadas de IA, pesquisa e provedores de dados deverão passar por backend seguro. Chaves e tokens nunca devem ser colocados no JavaScript público ou no repositório.

Os registros desta versão ficam no armazenamento local do navegador e não sincronizam entre dispositivos. Antes de uso com dinheiro real, será necessário validar as fontes, testar cálculos e avaliar o desempenho histórico.

## Estrutura

- `index.html`: interface.
- `css/style.css`: estilos responsivos.
- `js/app.js`: navegação, registros e cálculos locais.
