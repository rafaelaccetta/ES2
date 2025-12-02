# Trabalho de Engenharia de Software II.

## Instruções para rodar o jogo:

### Método 1: clonando o repositório
1. Clone o repositório

       https://github.com/rafaelaccetta/ES2.git
2. No terminal, vá para o diretório game dentro do repositório:

    cd %DIRETORIO_REPO%/game/
3. npm run dev
4. No navegador, acesse o endereço de host correspondente
     - Geralmente localhost:8000
5. Jogue o jogo

### Método 2: release
1. Na aba release deste projeto, clique na única release
2. Faça download de dist.zip
3. Descompacte o zip
4. Abra um servidor no diretório com os arquivos descompactados:
    * Exemplo com python:
      No terminal:
      
          cd %DIRETORIO_DIST%/
          python -m http.server
5. No navegador, acesse o endereço de host correspondente
   - Geralmente localhost:8000
6. Jogue o jogo

## Instruções para rodar testes:
1. Clone o repositório

       https://github.com/rafaelaccetta/ES2.git
2. No terminal, rode npm test no diretório game do repositório:

       cd %DIRETORIO_REPO%/game/
       npm test