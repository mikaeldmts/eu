// Função de upload avançada com fallback para CORS
async function uploadWithCORSFallback(file) {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Tentativa ${attempt}/${maxRetries} para ${file.name}`);
              // Verificar autenticação
            if (!auth.currentUser) {
                try {
                    console.log('Fazendo login anônimo...');
                    await signInAnonymously(auth);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (authError) {
                    console.warn('Login anônimo falhou, continuando sem autenticação:', authError);
                    // Continuar sem autenticação
                }
            }
            
            // Preparar upload
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const fileName = `galeria/${timestamp}_${randomId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const storageRef = ref(storage, fileName);
            
            // Configurar metadados otimizados para CORS
            const metadata = {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000',
                customMetadata: {
                    'uploadedBy': 'admin-panel',
                    'uploadedAt': new Date().toISOString(),
                    'domain': window.location.hostname
                }
            };
            
            // Usar Promise com timeout
            return await new Promise((resolve, reject) => {
                // Timeout global
                const globalTimeout = setTimeout(() => {
                    reject(new Error('Timeout no upload - Servidor não respondeu'));
                }, 120000); // 2 minutos
                
                const uploadTask = uploadBytesResumable(storageRef, file, metadata);
                
                let lastProgress = 0;
                let progressTimeout;
                
                uploadTask.on('state_changed',
                    (snapshot) => {
                        clearTimeout(globalTimeout);
                        clearTimeout(progressTimeout);
                        
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        lastProgress = progress;
                        
                        console.log(`Upload ${progress.toFixed(1)}% completo`);
                        
                        // Resetar timeout se houver progresso
                        progressTimeout = setTimeout(() => {
                            reject(new Error('Upload travou - Sem progresso por 30s'));
                        }, 30000);
                    },
                    (error) => {
                        clearTimeout(globalTimeout);
                        clearTimeout(progressTimeout);
                        
                        console.error('Erro no upload:', error);
                        
                        // Classificar tipo de erro
                        if (error.code === 'storage/unauthorized') {
                            reject(new Error('CORS/Autorização: Regras do Firebase não aplicadas'));
                        } else if (error.code === 'storage/unknown' || 
                                   error.message.includes('CORS') ||
                                   error.message.includes('XMLHttpRequest') ||
                                   error.message.includes('blocked')) {
                            reject(new Error('CORS: Configuração de Storage pendente'));
                        } else if (error.code === 'storage/canceled') {
                            reject(new Error('Upload cancelado'));
                        } else {
                            reject(new Error(`Upload falhou: ${error.message}`));
                        }
                    },
                    async () => {
                        clearTimeout(globalTimeout);
                        clearTimeout(progressTimeout);
                        
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            
                            resolve({
                                url: downloadURL,
                                type: file.type.startsWith('video') ? 'video' : 'image',
                                name: file.name,
                                size: file.size,
                                storagePath: fileName,
                                uploadedAt: new Date().toISOString(),
                                attempt: attempt
                            });
                        } catch (urlError) {
                            reject(new Error('Falha ao obter URL do arquivo'));
                        }
                    }
                );
            });
            
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou:`, error.message);
            
            // Se for o último tentativa, lançar erro
            if (attempt === maxRetries) {
                if (error.message.includes('CORS') || error.message.includes('Autorização')) {
                    throw new Error(`❌ ERRO DE CORS DETECTADO!\n\n` +
                        `As regras do Firebase Storage não foram aplicadas.\n\n` +
                        `SOLUÇÃO:\n` +
                        `1. Abra: https://console.firebase.google.com\n` +
                        `2. Vá para Storage → Rules\n` +
                        `3. Cole o conteúdo do arquivo firebase-rules.txt\n` +
                        `4. Clique em "Publicar"\n` +
                        `5. Aguarde 5-10 minutos\n\n` +
                        `Erro original: ${error.message}`);
                }
                throw error;
            }
            
            // Aguardar antes da próxima tentativa
            console.log(`Aguardando ${retryDelay * attempt}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
    }
}

// Exportar para usar no lugar da função original
window.uploadWithCORSFallback = uploadWithCORSFallback;
