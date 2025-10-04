// Configuration des annonces
const adConfig = {
  slots: [
    {
      id: 'ad-leaderboard',
      sizes: [[728, 90], [970, 90], [970, 250]],
      slot: '1234567890', // Remplacez par votre ID d'emplacement
      priority: 1
    },
    {
      id: 'ad-content-1',
      sizes: [[300, 250], [336, 280], [300, 600]],
      slot: '2345678901', // Remplacez par votre ID d'emplacement
      priority: 2
    },
    {
      id: 'ad-content-2',
      sizes: [[300, 250], [336, 280]],
      slot: '3456789012', // Remplacez par votre ID d'emplacement
      priority: 3
    },
    {
      id: 'ad-footer',
      sizes: [[728, 90], [300, 250]],
      slot: '4567890123', // Remplacez par votre ID d'emplacement
      priority: 4
    }
  ],
  adClient: 'ca-pub-7699432575717413', // Votre ID d'éditeur AdSense
  viewportThreshold: 0.5
};

// Classe de gestion des annonces
class AdManager {
  constructor() {
    this.slots = new Map();
    this.isMobile = window.innerWidth < 768;
    this.init();
  }

  init() {
    this.setupSlots();
    this.setupObservers();
    this.loadVisibleAds();
    this.setupResizeHandler();
  }

  setupSlots() {
    adConfig.slots.forEach(config => {
      const element = document.getElementById(config.id);
      if (element) {
        this.slots.set(config.id, {
          element,
          config,
          loaded: false,
          visible: false
        });
      }
    });
  }

  loadVisibleAds() {
    this.slots.forEach(slot => {
      if (!slot.loaded && this.isInViewport(slot.element)) {
        this.loadAd(slot);
      }
    });
  }

  loadAd(slot) {
    if (slot.loaded) return;
    
    const { element, config } = slot;
    
    // Créer l'élément ins
    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle';
    ad.style.display = 'block';
    
    // Configuration AdSense
    ad.setAttribute('data-ad-client', adConfig.adClient);
    ad.setAttribute('data-ad-slot', config.slot);
    ad.setAttribute('data-ad-format', 'auto');
    ad.setAttribute('data-full-width-responsive', 'true');
    
    // Ajouter les tailles
    config.sizes.forEach((size, i) => {
      ad.setAttribute(`data-ad-slot-${i}`, `${size[0]}x${size[1]}`);
    });
    
    // Vider et ajouter l'annonce
    element.innerHTML = '';
    element.appendChild(ad);
    
    // Désactiver temporairement le chargement automatique
    const pushAd = () => {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    };
    
    // Charger l'annonce
    if (window.adsbygoogle) {
      pushAd();
    } else {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = pushAd;
      document.head.appendChild(script);
    }
    
    slot.loaded = true;
    this.trackAdLoad(slot);
  }

  isInViewport(element, threshold = adConfig.viewportThreshold) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // Vérifier si l'élément est dans la fenêtre
    const isInView = (
      rect.top < viewportHeight * threshold &&
      rect.bottom > 0 &&
      rect.left < viewportWidth * threshold &&
      rect.right > 0
    );
    
    return isInView;
  }

  setupObservers() {
    // Utiliser Intersection Observer si disponible
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const slotId = entry.target.id;
            const slot = this.slots.get(slotId);
            if (slot && !slot.loaded) {
              this.loadAd(slot);
            }
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '200px 0px' // Charger 200px avant d'être visible
      });

      // Observer chaque emplacement
      this.slots.forEach(slot => {
        observer.observe(slot.element);
      });
    } else {
      // Fallback pour les anciens navigateurs
      window.addEventListener('scroll', this.throttle(this.loadVisibleAds.bind(this), 200));
    }
  }

  setupResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.isMobile = window.innerWidth < 768;
        this.loadVisibleAds();
      }, 250);
    });
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  trackAdLoad(slot) {
    // Intégration avec Google Analytics si disponible
    if (window.gtag) {
      gtag('event', 'ad_impression', {
        'event_category': 'adsense',
        'event_label': slot.config.slot,
        'value': slot.config.sizes[0].join('x'),
        'non_interaction': true
      });
    }
    
    // Envoyer des données d'analyse personnalisées
    const data = {
      event: 'ad_loaded',
      ad_slot: slot.config.slot,
      timestamp: new Date().toISOString(),
      device_type: this.isMobile ? 'mobile' : 'desktop',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    // Envoyer les données à votre backend (optionnel)
    if (window.navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/ad-analytics', blob);
    }
  }
}

// Initialisation
function initAds() {
  // Vérifier si on est pas dans un iframe et si AdSense est chargé
  if (window.self === window.top && window.adsbygoogle) {
    try {
      window.adManager = new AdManager();
      console.log('Gestionnaire d\'annonces initialisé avec succès');
    } catch (e) {
      console.error('Erreur lors de l\'initialisation du gestionnaire d\'annonces:', e);
    }
  } else {
    // Réessayer après un court délai si AdSense n'est pas encore chargé
    setTimeout(initAds, 500);
  }
}

// Démarrer l'initialisation des annonces
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAds);
} else {
  // Si le DOM est déjà chargé
  setTimeout(initAds, 0);
}
