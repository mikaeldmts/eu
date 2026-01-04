/**
 * Sistema Centralizado de Rate Limiting para GitHub API
 * Usado por todos os componentes do site para garantir conformidade
 * 
 * @author Mikael Ferreira
 * @version 2.0
 */

// ==================== CONFIGURAÇÃO CENTRALIZADA ====================

export const GITHUB_CONFIG = {
    // Rate Limiting (com token = 5000/hora, sem token = 60/hora)
    MAX_REQUESTS_PER_HOUR: 5000,
    RATE_LIMIT_WINDOW: 60 * 60 * 1000, // 1 hora em millisegundos
    RATE_LIMIT_KEY: 'github_unified_rate_limit',
    
    // Token de autenticação (aumenta limite de 60 para 5000 req/hora)
    AUTH_TOKEN: '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',
    
    // Cache
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
    PROFILE_CACHE_KEY: 'github_profile_cache',
    REPOS_CACHE_KEY: 'github_repos_cache',
    
    // Retry
    RETRY_DELAYS: [1000, 2000, 5000, 10000], // Backoff exponencial
    MAX_RETRIES: 3,
    
    // GitHub API
    BASE_URL: 'https://api.github.com',
    USERNAME: 'mikael-ferreira'
};

// ==================== SISTEMA DE RATE LIMITING ====================

class GitHubRateLimit {
    constructor() {
        this.config = GITHUB_CONFIG;
        this.listeners = new Set();
    }

    /**
     * Verifica se é possível fazer uma requisição
     * @returns {Object} { canMakeRequest: boolean, requestsLeft: number, resetTime?: number }
     */
    checkRateLimit() {
        try {
            // Em ambiente de desenvolvimento local, não bloquear por rate limit persistido
            // (evita ficar travado por 1h por conta de testes/reloads)
            const hostname = (typeof location !== 'undefined' && location.hostname) ? location.hostname : '';
            const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
            if (isLocalDev) {
                return {
                    canMakeRequest: true,
                    requestsLeft: this.config.MAX_REQUESTS_PER_HOUR
                };
            }

            const rateLimitData = localStorage.getItem(this.config.RATE_LIMIT_KEY);
            const now = Date.now();
            
            if (!rateLimitData) {
                return { 
                    canMakeRequest: true, 
                    requestsLeft: this.config.MAX_REQUESTS_PER_HOUR 
                };
            }
            
            const data = JSON.parse(rateLimitData);
            
            // Reset se a janela de tempo passou
            if (now - data.windowStart > this.config.RATE_LIMIT_WINDOW) {
                return { 
                    canMakeRequest: true, 
                    requestsLeft: this.config.MAX_REQUESTS_PER_HOUR 
                };
            }
            
            const requestsLeft = this.config.MAX_REQUESTS_PER_HOUR - data.requestCount;
            const resetTime = data.windowStart + this.config.RATE_LIMIT_WINDOW;
            
            return {
                canMakeRequest: requestsLeft > 0,
                requestsLeft: Math.max(0, requestsLeft),
                resetTime
            };
        } catch (error) {
            console.warn('🔴 Erro ao verificar rate limit:', error);
            return { 
                canMakeRequest: true, 
                requestsLeft: this.config.MAX_REQUESTS_PER_HOUR 
            };
        }
    }

    /**
     * Incrementa o contador de requisições
     */
    incrementRateLimit() {
        try {
            const now = Date.now();
            const rateLimitData = localStorage.getItem(this.config.RATE_LIMIT_KEY);
            
            let data;
            if (!rateLimitData) {
                data = { windowStart: now, requestCount: 1 };
            } else {
                data = JSON.parse(rateLimitData);
                
                // Reset se a janela de tempo passou
                if (now - data.windowStart > this.config.RATE_LIMIT_WINDOW) {
                    data = { windowStart: now, requestCount: 1 };
                } else {
                    data.requestCount += 1;
                }
            }
            
            localStorage.setItem(this.config.RATE_LIMIT_KEY, JSON.stringify(data));
            
            // Notificar listeners sobre mudança no rate limit
            this.notifyListeners(data);
            
            console.log(`🔵 Rate Limit atualizado: ${data.requestCount}/${this.config.MAX_REQUESTS_PER_HOUR}`);
        } catch (error) {
            console.warn('🔴 Erro ao atualizar rate limit:', error);
        }
    }

    /**
     * Adiciona um listener para mudanças no rate limit
     * @param {Function} callback 
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove um listener
     * @param {Function} callback 
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notifica todos os listeners sobre mudanças
     * @param {Object} data 
     */
    notifyListeners(data) {
        const status = this.checkRateLimit();
        this.listeners.forEach(callback => {
            try {
                callback(status, data);
            } catch (error) {
                console.warn('🔴 Erro ao notificar listener:', error);
            }
        });
    }

    /**
     * Obtém estatísticas do rate limit
     * @returns {Object}
     */
    getStats() {
        const status = this.checkRateLimit();
        const data = localStorage.getItem(this.config.RATE_LIMIT_KEY);
        
        if (!data) {
            return {
                requestsUsed: 0,
                requestsLeft: this.config.MAX_REQUESTS_PER_HOUR,
                resetTime: null,
                windowStart: null
            };
        }

        const parsed = JSON.parse(data);
        return {
            requestsUsed: parsed.requestCount || 0,
            requestsLeft: status.requestsLeft,
            resetTime: status.resetTime,
            windowStart: new Date(parsed.windowStart)
        };
    }

    /**
     * Reseta o rate limit (para testes ou emergências)
     */
    reset() {
        localStorage.removeItem(this.config.RATE_LIMIT_KEY);
        console.log('🟡 Rate limit resetado');
    }
}

// ==================== SISTEMA DE CACHE ====================

class GitHubCache {
    constructor() {
        this.config = GITHUB_CONFIG;
    }

    /**
     * Verifica se o cache é válido
     * @param {string} key 
     * @returns {boolean}
     */
    isCacheValid(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return false;

            const data = JSON.parse(cached);
            const now = Date.now();
            
            return (now - data.timestamp) < this.config.CACHE_DURATION;
        } catch (error) {
            console.warn('🔴 Erro ao verificar cache:', error);
            return false;
        }
    }

    /**
     * Obtém dados do cache
     * @param {string} key 
     * @returns {any|null}
     */
    getCache(key) {
        try {
            if (!this.isCacheValid(key)) return null;

            const cached = localStorage.getItem(key);
            const data = JSON.parse(cached);
            
            console.log(`🟢 Cache hit para ${key}`);
            return data.value;
        } catch (error) {
            console.warn('🔴 Erro ao obter cache:', error);
            return null;
        }
    }

    /**
     * Salva dados no cache
     * @param {string} key 
     * @param {any} value 
     */
    setCache(key, value) {
        try {
            const data = {
                value,
                timestamp: Date.now()
            };
            
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`🟢 Cache salvo para ${key}`);
        } catch (error) {
            console.warn('🔴 Erro ao salvar cache:', error);
        }
    }

    /**
     * Limpa cache expirado
     */
    cleanExpiredCache() {
        const keys = [
            this.config.PROFILE_CACHE_KEY,
            this.config.REPOS_CACHE_KEY
        ];

        keys.forEach(key => {
            if (!this.isCacheValid(key)) {
                localStorage.removeItem(key);
                console.log(`🟡 Cache expirado removido: ${key}`);
            }
        });
    }
}

// ==================== CLASSE PRINCIPAL ====================

class GitHubAPIManager {
    constructor() {
        this.rateLimit = new GitHubRateLimit();
        this.cache = new GitHubCache();
        this.config = GITHUB_CONFIG;
    }

    /**
     * Faz uma requisição ao GitHub com rate limiting e cache
     * @param {string} endpoint 
     * @param {boolean} useCache 
     * @returns {Promise<any>}
     */
    async makeRequest(endpoint, useCache = true) {
        const cacheKey = `github_cache_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Verificar cache primeiro
        if (useCache) {
            const cached = this.cache.getCache(cacheKey);
            if (cached) return cached;
        }

        // Verificar rate limit
        const rateStatus = this.rateLimit.checkRateLimit();
        if (!rateStatus.canMakeRequest) {
            const resetTime = new Date(rateStatus.resetTime);
            throw new Error(`Rate limit excedido. Reset em: ${resetTime.toLocaleTimeString()}`);
        }

        const url = `${this.config.BASE_URL}${endpoint}`;
        let lastError;

        // Headers com autenticação (aumenta rate limit de 60 para 5000/hora)
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (this.config.AUTH_TOKEN) {
            headers['Authorization'] = `token ${this.config.AUTH_TOKEN}`;
        }

        // Tentar com retry
        for (let attempt = 0; attempt < this.config.MAX_RETRIES; attempt++) {
            try {
                console.log(`🔵 Fazendo requisição: ${endpoint} (tentativa ${attempt + 1})`);
                
                const response = await fetch(url, { headers });
                
                // Incrementar rate limit após requisição bem-sucedida
                this.rateLimit.incrementRateLimit();
                
                if (!response.ok) {
                    if (response.status === 403) {
                        // Rate limit REAL do GitHub - não adianta fazer retry
                        const resetHeader = response.headers.get('x-ratelimit-reset');
                        const resetTime = resetHeader ? new Date(parseInt(resetHeader) * 1000) : null;
                        const err = new Error('Rate limit do GitHub excedido');
                        err.noRetry = true; // Sinaliza para não fazer retry
                        err.resetTime = resetTime;
                        throw err;
                    }
                    if (response.status === 404) {
                        const err = new Error('Recurso não encontrado');
                        err.noRetry = true;
                        throw err;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                // Salvar no cache
                if (useCache) {
                    this.cache.setCache(cacheKey, data);
                }

                console.log(`🟢 Requisição bem-sucedida: ${endpoint}`);
                return data;

            } catch (error) {
                lastError = error;
                console.warn(`🔴 Erro na tentativa ${attempt + 1}: ${error.message}`);
                
                // Se erro indica que não adianta retry (403/404), parar imediatamente
                if (error.noRetry) {
                    console.log('🛑 Erro não recuperável, pulando retries.');
                    break;
                }
                
                if (attempt < this.config.MAX_RETRIES - 1) {
                    const delay = this.config.RETRY_DELAYS[attempt];
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Obtém estatísticas do sistema
     * @returns {Object}
     */
    getSystemStats() {
        return {
            rateLimit: this.rateLimit.getStats(),
            config: {
                maxRequestsPerHour: this.config.MAX_REQUESTS_PER_HOUR,
                cacheDuration: this.config.CACHE_DURATION / (1000 * 60), // em minutos
                rateLimitWindow: this.config.RATE_LIMIT_WINDOW / (1000 * 60) // em minutos
            }
        };
    }
}

// ==================== INSTÂNCIA SINGLETON ====================

// Criar instância única para todo o sistema
export const gitHubAPI = new GitHubAPIManager();

// Exportar classes individuais para casos específicos
export { GitHubRateLimit, GitHubCache, GitHubAPIManager };

// Compatibilidade com scripts antigos
window.GitHubAPI = gitHubAPI;

console.log('🟢 Sistema Centralizado de GitHub API inicializado');
