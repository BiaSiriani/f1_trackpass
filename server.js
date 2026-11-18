const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Função para ler o banco JSON
function lerBanco() {
    if (!fs.existsSync('database.json')) {
        return { organizacoes: [], credenciados: [] };
    }
    const data = fs.readFileSync('database.json', 'utf8');
    return JSON.parse(data);
}

// Função para salvar no banco JSON
function salvarBanco(dados) {
    fs.writeFileSync('database.json', JSON.stringify(dados, null, 2), 'utf8');
}

// Rota 1: Listagem (Read) com Busca Útil
app.get('/', (req, res) => {
    const db = lerBanco();
    const busca = req.query.busca ? req.query.busca.toLowerCase() : '';

    // Cruzar dados de credenciados com suas organizações
    let credenciados = db.credenciados.map(c => {
        const org = db.organizacoes.find(o => o.id == c.organizacao_id);
        return { ...c, org_nome: org ? org.nome : 'Sem Equipe', org_tipo: org ? org.tipo : '' };
    });

    // Aplicar filtro de busca se o usuário pesquisar algo
    if (busca) {
        credenciados = credenciados.filter(c => 
            c.nome_completo.toLowerCase().includes(busca) || 
            c.documento.toLowerCase().includes(busca) ||
            c.funcao.toLowerCase().includes(busca)
        );
    }

    res.render('index', { credenciados, busca, organizacoes: db.organizacoes });
});

// Rota 2: Página de Cadastro (Formulário)
app.get('/novo', (req, res) => {
    const db = lerBanco();
    res.render('novo', { organizacoes: db.organizacoes, erro: null });
});

// Rota 3: Salvar Novo Credenciado (Create + Validação)
app.post('/novo', (req, res) => {
    const { nome_completo, documento, funcao, organizacao_id, zona } = req.body;
    const db = lerBanco();

    // Validação: Verificar se o documento já existe
    const duplicado = db.credenciados.find(c => c.documento === documento);
    if (duplicado) {
        return res.render('novo', { 
            organizacoes: db.organizacoes, 
            erro: 'Erro: Já existe um credenciado com este número de documento!' 
        });
    }

    // Regra de negócio: Imprensa não pode acessar o Pit Lane diretamente
    const org = db.organizacoes.find(o => o.id == organizacao_id);
    if (org && org.tipo === 'Imprensa' && zona === 'Pit Lane / Paddock') {
        return res.render('novo', { 
            organizacoes: db.organizacoes, 
            erro: 'Regra de Segurança: Membros da Imprensa não têm permissão para a zona Pit Lane.' 
        });
    }

    // Criar novo registro com ID auto-incremento
    const novoId = db.credenciados.length > 0 ? db.credenciados[db.credenciados.length - 1].id + 1 : 1;
    
    db.credenciados.push({
        id: novoId,
        nome_completo,
        documento,
        funcao,
        organizacao_id: Number(organizacao_id),
        zona
    });

    salvarBanco(db);
    res.redirect('/');
});

// Rota 4: Excluir Credenciado (Delete)
app.post('/excluir/:id', (req, res) => {
    const id = Number(req.params.id);
    let db = lerBanco();

    db.credenciados = db.credenciados.filter(c => c.id !== id);
    salvarBanco(db);

    res.redirect('/');
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});