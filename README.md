# FUNAT Fiscalização · app de campo (versão web)

App de campo da fiscalização ambiental da **FUNAT – Fundação Municipal de Meio Ambiente de Tubarão/SC**, na versão que roda no navegador. Feita para o **iPhone**, que não recebe o app Android.

**Endereço:** <https://magoboy.github.io/funat-campo/>

## Instalar no iPhone
1. Abra o endereço acima no **Safari**.
2. Toque em **Compartilhar** › **Adicionar à Tela de Início**.
3. Abra pelo ícone **FUNAT Campo**. Depois da primeira abertura, o app funciona **sem internet**, no campo.

## O que faz
- **Demandas da planilha:** as suas demandas em aberto, lidas com a chave do aparelho, num Wi-Fi com internet.
- **Vistoria:** fotos com data, hora e posição (UTM), medições de ruído e anotações, tudo guardado no próprio iPhone.
- **Itinerário do dia:**
  - escolher as paradas com a dupla;
  - rota mais curta pelas ruas, com mapa;
  - próxima parada, resumo, refazer, cancelar e desfazer.
- **Itinerário da dupla:** enviado e aberto como arquivo, pelo Compartilhar.
- **Levar à pasta da FUNAT:** **Salvar as N na pasta** manda todas as vistorias pendentes de uma vez, pelo Compartilhar › Salvar em Arquivos › sua pasta › VISTORIAS. Antes, ligue uma vez o app Arquivos ao servidor da FUNAT; o passo a passo está no próprio app.
- **Atualização:** quando há versão nova, aparece a faixa **"Nova versão do app · Atualizar agora"**. As vistorias continuam no aparelho.

## O que só o app Android faz
O navegador não alcança a pasta da rede. Por isso estes recursos existem só no Android:
- o envio automático das vistorias;
- a aba **Documentos** (andamento dos documentos na revisão);
- a correção de documentos devolvidos no celular.

O APK do Android de cada versão está em **[Releases](https://github.com/magoboy/funat-campo/releases)**. Para funcionar, ele precisa do acesso à pasta da FUNAT e da chave da planilha, dados pela equipe.

## Privacidade
Este repositório tem **só o site gerado**: nenhum dado, foto, senha ou chave. As vistorias ficam apenas em cada aparelho até serem salvas na pasta da FUNAT. O site não usa analytics nem cookies de terceiros. O cálculo da rota manda ao serviço público OSRM **só as coordenadas** das paradas, sem nomes nem endereços.

## Versões
Cada versão publicada tem uma etiqueta (`v0.9.6`, `v0.9.4`…). O código-fonte e o histórico detalhado ficam num repositório privado da equipe.

| Versão | Data | Destaques |
|---|---|---|
| 0.9.6 | 14/10/2026 | Voltar ao local (2ª visita a uma fiscalização, com motivo e referência da anterior), trocar o tipo de documento depois da vistoria, retorno combinado opcional e atualização mais firme do app no iPhone. |
| 0.9.4 | 13/10/2026 | Itinerário do dia e da dupla, "Salvar as N na pasta" e aviso de versão nova. |
| 0.7.1 | 08/10/2026 | Animações e transições mais suaves; correções na leitura do protocolo do 1Doc. |
| 0.7.0 | 07/10/2026 | Correção sem rede (no Android) e ajustes da versão web. |
| 0.6.3 | 07/10/2026 | Primeira versão web: vistorias, fotos com GPS e envio pelo app Arquivos. |
