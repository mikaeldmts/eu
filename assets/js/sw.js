// Service Worker básico para PWA
const CACHE_NAME = 'portfolio-v1';

self.addEventListener('install', event => {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker ativado');
});

self.addEventListener('fetch', event => {
    // Apenas buscar da rede sem cache por enquanto
    event.respondWith(fetch(event.request));
});
