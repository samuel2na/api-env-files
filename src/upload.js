import multer from 'multer';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { URL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configurações de diretório temporário para o Multer ---
const UPLOAD_TEMP_DIR = path.resolve(__dirname, 'tempUploads');

// Garante que o diretório temporário exista
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
    fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

// Configuração do Multer para armazenamento de arquivos em disco
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_TEMP_DIR); // Salva o arquivo temporariamente neste diretório
    },
    filename: (req, file, cb) => {
        // Mantém o nome original do arquivo. Não da conflito pois no nome tem o timestamp
        cb(null, file.originalname);
    }
});

// INSTÂNCIA DO MULTER PARA SER EXPORTADA E USADA COMO MIDDLEWARE
// Renomeei para 'uploadMiddleware' para ser mais descritivo no contexto de exportação
const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB por arquivo (ajuste conforme necessário)
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'arquivo' && file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo inválido. Apenas PDF é permitido no campo "arquivo".'), false);
        }
    }
}).single('arquivo'); // <-- IMPORTANTE: .single('arquivo') já está aqui, ele cria o middleware final.

// --- Função para Upload para Azure Blob Storage ---
async function uploadFileToAzure(filePath, blobFileName, urlSasUpload) { // Removido blobDestinationPath pois urlSasUpload é a URL completa
    return new Promise((resolve, reject) => {
        const url = new URL(urlSasUpload); // A URL já vem completa com SAS e nome do blob

        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search, // Inclui a query string SAS
            method: 'PUT',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': 'application/pdf', // Assumindo PDF
                'Content-Length': stats.size,
            },
        };

        const req = https.request(options, res => {
            if (res.statusCode === 201) {
                console.log(`✅ Upload de '${blobFileName}' concluído com sucesso para ${urlSasUpload}!`);
                resolve(true);
            } else {
                console.error(`❌ Falha no upload de '${blobFileName}' para ${urlSasUpload}. Status: ${res.statusCode}`);
                res.on('data', chunk => console.error(chunk.toString()));
                resolve(false);
            }
        });

        req.on('error', err => {
            console.error(`Erro ao enviar arquivo '${blobFileName}' para ${urlSasUpload}:`, err);
            reject(err);
        });

        fileStream.pipe(req);
    });
}

// --- Sua função controladora principal ---
// Renomeada para 'uploadController' para clareza
async function uploadController(req, res, next) {
    // req.file é populado pelo Multer com os dados do arquivo (campo 'arquivo')
    // req.body é populado pelo Multer com os outros campos de texto ('tipo', 'urlSasUpload')

    if (!req.file) {
        // Se o Multer falhou, ele já pode ter enviado um erro, mas esta verificação é boa
        return res.status(400).json({ message: 'Nenhum arquivo enviado ou tipo inválido.' });
    }

    const { originalname, path: tempFilePath } = req.file;
    const { tipo, urlSasUpload } = req.body;

    // --- Validações ---
    if (!tipo || !['DI', 'CI', 'CE'].includes(tipo.toUpperCase())) {
        fs.unlinkSync(tempFilePath); // Remove o arquivo temporário
        return res.status(400).json({ message: 'Tipo de documento inválido.' }); //Use DI, CI ou CE.
    }
    if (!urlSasUpload || typeof urlSasUpload !== 'string' || !urlSasUpload.startsWith('https://')) {
        fs.unlinkSync(tempFilePath); // Remove o arquivo temporário
        return res.status(400).json({ message: 'URL SAS para upload inválida.' });
    }

    console.log(`Requisição de Upload Recebida:`);
    console.log(`  Arquivo: ${originalname}`);
    console.log(`  Tipo: ${tipo}`);
    console.log(`  URL SAS para Upload: ${urlSasUpload}`);
    console.log(`  Caminho temporário local: ${tempFilePath}`);

    try {
        // Chamada da função de upload para o Azure
        // Passamos 'urlSasUpload' diretamente, pois ela já contém a SAS e o nome do blob
        
        const uploadSuccess = await uploadFileToAzure(tempFilePath, originalname, urlSasUpload);
        //const uploadSuccess = true;

        // Sempre remova o arquivo temporário após o processamento
        fs.unlinkSync(tempFilePath);
        console.log(`Arquivo temporário '${tempFilePath}' removido.`);

        if (uploadSuccess) {
            res.status(200).json({
                message: 'Upload de PDF concluído com sucesso para o Azure Blob Storage!',
                fileName: originalname,
                fileType: tipo.toUpperCase(),
                uploadedToUrl: urlSasUpload // Retorna a URL para confirmação
            });
        } else {
            res.status(500).json({
                message: 'Falha ao fazer upload do PDF para o Azure Blob Storage.',
                fileName: originalname,
                fileType: tipo.toUpperCase()
            });
        }

    } catch (error) {
        console.error('Erro no processamento do upload:', error);
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Arquivo temporário '${tempFilePath}' removido após erro.`);
        }
        res.status(500).json({
            message: 'Erro interno no servidor durante o upload.',
            error: error.message,
            stack: error.stack
        });
    }
}

// EXPORTA AS DUAS PARTES NECESSÁRIAS: O MIDDLEWARE DO MULTER E A FUNÇÃO CONTROLADORA
export { uploadMiddleware, uploadController };