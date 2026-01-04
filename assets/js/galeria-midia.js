// Galeria de Mídia JavaScript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    orderBy, 
    query, 
    limit, 
    startAfter, 
    where,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA0VoWMLTJIyI54Pj0P5T75gCH6KpgAcbk",
    authDomain: "mikaelfmts.firebaseapp.com",
    projectId: "mikaelfmts",
    storageBucket: "mikaelfmts.appspot.com",
    messagingSenderId: "516762612351",
    appId: "1:516762612351:web:f8a0f229ffd5def8ec054a"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class GaleriaMidia {
    constructor() {
        this.posts = [];
        this.filteredPosts = [];
        this.currentFilter = 'all';
        this.lastDoc = null;
        this.postsPerPage = 6;
        this.currentMediaIndex = 0;
        this.currentPostMedia = [];
        
        this.init();
    }

    async init() {
        await this.loadPosts();
        this.setupEventListeners();
        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 1000);
        }
    }    async loadPosts(loadMore = false) {
        try {
            let q;
            if (loadMore && this.lastDoc) {
                q = query(
                    collection(db, 'galeria_posts'),
                    orderBy('createdAt', 'desc'),
                    startAfter(this.lastDoc),
                    limit(this.postsPerPage)
                );
            } else {
                q = query(
                    collection(db, 'galeria_posts'),
                    orderBy('createdAt', 'desc'),
                    limit(this.postsPerPage)
                );
            }

            const querySnapshot = await getDocs(q);
            const newPosts = [];            // Carregar posts e suas mídias
            for (const postDoc of querySnapshot.docs) {
                const postData = {
                    id: postDoc.id,
                    ...postDoc.data()
                };// Se o post tem referências de mídia, carregar do galeria_media
                if (postData.mediaIds && postData.mediaIds.length > 0) {
                    const mediaPromises = postData.mediaIds.map(async (mediaId) => {
                        try {
                            const mediaDocRef = doc(db, 'galeria_media', mediaId);
                            const mediaDoc = await getDoc(mediaDocRef);
                            if (mediaDoc.exists()) {
                                return {
                                    id: mediaId,
                                    url: mediaDoc.data().data, // Base64 data
                                    type: mediaDoc.data().type,
                                    name: mediaDoc.data().name
                                };
                            }
                        } catch (error) {
                            console.error('Erro ao carregar mídia:', error);
                            return null;
                        }
                    });
                    
                    const mediaResults = await Promise.all(mediaPromises);
                    postData.media = mediaResults.filter(media => media !== null);
                } else if (postData.media) {
                    // Manter compatibilidade com posts antigos que já têm URLs diretas
                    postData.media = postData.media;
                } else {
                    postData.media = [];
                }

                newPosts.push(postData);
            }

            if (loadMore) {
                this.posts = [...this.posts, ...newPosts];
            } else {
                this.posts = newPosts;
            }

            // Atualizar lastDoc para paginação
            if (querySnapshot.docs.length > 0) {
                this.lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            }

            this.applyFilter(this.currentFilter, !loadMore);
            this.updateLoadMoreButton(querySnapshot.docs.length === this.postsPerPage);

        } catch (error) {
            console.error('Erro ao carregar posts:', error);
            this.showError('Erro ao carregar posts');
        }
    }

    renderPosts(posts) {
        const postsContainer = document.getElementById('posts-feed');
        
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #c8aa6e;">
                    <i class="fas fa-images" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Nenhum post encontrado</h3>
                    <p>Não há posts para exibir no momento.</p>
                </div>
            `;
            return;
        }

        const postsHTML = posts.map(post => this.createPostHTML(post)).join('');
        postsContainer.innerHTML = postsHTML;
    }

    createPostHTML(post) {
        const date = new Date(post.timestamp?.toDate ? post.timestamp.toDate() : post.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const firstMedia = post.media && post.media[0];
        const mediaType = firstMedia?.type || 'image';
        const mediaCount = post.media?.length || 0;

        let mediaHTML = '';
        if (firstMedia) {        // Melhor detecção de vídeo
        const isVideo = mediaType && (
            mediaType.startsWith('video/') || 
            mediaType === 'video' ||
            /\.(mp4|webm|ogg|avi|mov)$/i.test(firstMedia.url)
        );

        if (isVideo) {
                mediaHTML = `
                    <video preload="metadata" muted>
                        <source src="${firstMedia.url}" type="${mediaType.startsWith('video/') ? mediaType : 'video/mp4'}">
                    </video>
                    <div class="media-indicator">
                        <i class="fas fa-play"></i>
                    </div>
                `;
            } else {
                mediaHTML = `
                    <img src="${firstMedia.url}" alt="${post.title}" loading="lazy"
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;media-placeholder&quot;><i class=&quot;fas fa-image&quot;></i></div>';">
                    <div class="media-indicator">
                        <i class="fas fa-image"></i>
                    </div>
                `;
            }

            if (mediaCount > 1) {
                mediaHTML += `<div class="media-count">${mediaCount} itens</div>`;
            }
        }

        return `
            <article class="post-card" data-post-id="${post.id}" onclick="galeriaApp.openPost('${post.id}')">
                <div class="post-header">
                    <h3 class="post-title">${post.title}</h3>
                    <time class="post-date">${formattedDate}</time>
                </div>
                ${firstMedia ? `<div class="post-media">${mediaHTML}</div>` : ''}
                <div class="post-description">
                    ${post.description}
                </div>
            </article>
        `;
    }

    setupEventListeners() {
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setActiveFilter(e.target);
                this.applyFilter(filter);
            });
        });

        // Load More
        const loadMoreBtn = document.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadPosts(true);
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('media-modal').classList.contains('hidden')) return;
            
            if (e.key === 'Escape') {
                this.closeMediaModal();
            } else if (e.key === 'ArrowLeft') {
                this.navigateMedia(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateMedia(1);
            }
        });
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    applyFilter(filter, clearContainer = true) {
        this.currentFilter = filter;
        
        let filtered = this.posts;
          if (filter === 'photos') {
            filtered = this.posts.filter(post => 
                post.media && post.media.some(media => {
                    const type = media.type || '';
                    return type.startsWith('image/') || 
                           (!type.startsWith('video/') && type !== 'video' && 
                            !/\.(mp4|webm|ogg|avi|mov)$/i.test(media.url));
                })
            );
        } else if (filter === 'videos') {
            filtered = this.posts.filter(post => 
                post.media && post.media.some(media => {
                    const type = media.type || '';
                    return type.startsWith('video/') || 
                           type === 'video' ||
                           /\.(mp4|webm|ogg|avi|mov)$/i.test(media.url);
                })
            );
        }

        this.filteredPosts = filtered;
        
        if (clearContainer) {
            this.renderPosts(filtered);
        } else {
            // Append new posts
            const postsContainer = document.getElementById('posts-feed');
            const newPosts = filtered.slice(postsContainer.children.length);
            newPosts.forEach(post => {
                postsContainer.innerHTML += this.createPostHTML(post);
            });
        }
    }

    updateLoadMoreButton(hasMore) {
        const loadMoreContainer = document.getElementById('load-more');
        if (hasMore && this.filteredPosts.length >= this.postsPerPage) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }

    openPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !post.media || post.media.length === 0) return;

        this.currentPostMedia = post.media;
        this.currentMediaIndex = 0;
        
        this.showMediaModal();
        this.updateModalContent();
    }

    showMediaModal() {
        const modal = document.getElementById('media-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeMediaModal() {
        const modal = document.getElementById('media-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Pause any playing videos
        const videos = modal.querySelectorAll('video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }

    updateModalContent() {
        const modalBody = document.querySelector('.modal-body');
        const media = this.currentPostMedia[this.currentMediaIndex];
        
        if (!media) return;        let mediaHTML = '';
        const mediaType = media.type || '';
        const isVideo = mediaType.startsWith('video/') || 
                       mediaType === 'video' ||
                       /\.(mp4|webm|ogg|avi|mov)$/i.test(media.url);

        if (isVideo) {
            mediaHTML = `
                <video controls autoplay muted>
                    <source src="${media.url}" type="${mediaType.startsWith('video/') ? mediaType : 'video/mp4'}">
                    Seu navegador não suporta vídeos.
                </video>
            `;
        } else {
            mediaHTML = `<img src="${media.url}" alt="Mídia" loading="lazy">`;
        }

        modalBody.innerHTML = mediaHTML;

        // Update navigation buttons
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        prevBtn.style.display = this.currentMediaIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = this.currentMediaIndex < this.currentPostMedia.length - 1 ? 'block' : 'none';
    }

    navigateMedia(direction) {
        const newIndex = this.currentMediaIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.currentPostMedia.length) {
            this.currentMediaIndex = newIndex;
            this.updateModalContent();
        }
    }

    showError(message) {
        console.error(message);
        // Aqui você pode implementar um sistema de notificações
    }
}

// Funções globais para eventos inline
window.closeMediaModal = function() {
    if (window.galeriaApp) {
        window.galeriaApp.closeMediaModal();
    }
};

window.navigateMedia = function(direction) {
    if (window.galeriaApp) {
        window.galeriaApp.navigateMedia(direction);
    }
};

// Inicializar quando o DOM estiver carregado
let galeriaApp;
document.addEventListener('DOMContentLoaded', () => {
    galeriaApp = new GaleriaMidia();
    window.galeriaApp = galeriaApp;
});
