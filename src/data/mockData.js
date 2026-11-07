/**
 * Datos Base Sincronizados con HONE CATALOG — JAZYALON Corsetería Victoriana
 * 100% conectado en tiempo real con el Panel de Administración (Productos, Colecciones, Categorías y Nuevos Drops)
 */

export const BRAND_INFO = {
  name: "JAZYALON",
  subtitle: "CORSETS VICTORIANOS",
  origin: "Corsetería Victoriana",
  tagline: "Corsetería victoriana con ballenas de acero y telas brocadas en Chile.",
  history: "Corsetería victoriana estructurada con auténticas ballenas de acero y brocados finos. Envíos a todo Chile.",
  whatsappNumber: "+56 9 4018 7563",
  whatsappRaw: "+56940187563",
  defaultCoupon: "antonella10",
  instagram: "@jazyalon.cl",
  instagramUrl: "https://instagram.com/jazyalon.cl",
  email: "contacto@jazyalon.cl",
  address: "Santiago & Despachos a todo Chile",
  freeShippingThreshold: 60000, // CLP
};

export const ANNOUNCEMENTS = [
  "Colección Corsetería • Nuevos Ingresos Disponibles",
  "10% OFF en tu primera compra con el cupón: antonella10",
  "Envíos gratis a todo Chile por compras sobre $60.000",
  "Despachos rápidos vía Starken, Chilexpress y Blue Express",
  "Hasta 6 cuotas sin interés con Webpay Plus y Transferencia"
];

export const HERO_SLIDES = [
  {
    id: 1,
    title: "Corsets Victorianos",
    subtitle: "Ballenas de acero espiralado y reducción de cintura de 5 a 10 cm.",
    category: "corsets-brocado",
    cta: "Explorar Corsetería",
    tag: "Drop 01",
    image: "/fotos/01.png"
  },
  {
    id: 2,
    title: "Corsetería de Encaje",
    subtitle: "Siluetas estructuradas en encaje floral y satén de alta costura.",
    category: "corsets-encaje",
    cta: "Ver Encaje",
    tag: "Drop 02",
    image: "/fotos/02.jpg"
  },
  {
    id: 3,
    title: "Corsets Manga Larga",
    subtitle: "Encaje romántico con mangas estructuradas y escote corazón.",
    category: "corsets-mangas",
    cta: "Descubrir Diseños",
    tag: "Drop 03",
    image: "/fotos/03.jpg"
  }
];

export const CATEGORIES = [
  { id: 'all', name: 'Todos los Diseños', count: 9 },
  { id: 'corsets-brocado', name: 'Corsets Brocado & Satén', count: 3 },
  { id: 'corsets-encaje', name: 'Corsets de Encaje', count: 2 },
  { id: 'corsets-mangas', name: 'Corsets con Mangas', count: 2 },
  { id: 'corsets-denim', name: 'Corsets Denim & Lúrex', count: 2 }
];

export const COLLECTIONS = [
  {
    id: 'destacados-principal',
    name: 'Nuevos Drops & Destacados',
    subtitle: 'Selección principal de corsets estructurados con ballenas de acero.',
    itemCount: 'Destacados en Portada',
    image: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
    primaryProductId: 'prod-001',
    isPrimaryFeatured: true
  },
  {
    id: 'brocado-imperial',
    name: 'Brocado & Satén',
    subtitle: 'Corsetería clásica en brocado damasco y satén plisado.',
    itemCount: '3 diseños',
    image: '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg',
    primaryProductId: 'prod-002',
    isPrimaryFeatured: false
  },
  {
    id: 'encaje-romantico',
    name: 'Encaje Floral',
    subtitle: 'Detalles en encaje fino, lazos de satén y terminaciones románticas.',
    itemCount: '2 diseños',
    image: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg',
    primaryProductId: 'prod-005',
    isPrimaryFeatured: false
  },
  {
    id: 'mangas-encaje',
    name: 'Mangas de Encaje',
    subtitle: 'Corsets estructurados con mangas largas de encaje floral.',
    itemCount: '2 diseños',
    image: '/catalogo/IMG_8375.jpeg',
    primaryProductId: 'prod-008',
    isPrimaryFeatured: false
  },
  {
    id: 'denim-lurex',
    name: 'Denim & Lúrex',
    subtitle: 'Texturas metalizadas, lúrex brillante y mezclilla estructurada.',
    itemCount: '2 diseños',
    image: '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg',
    primaryProductId: 'prod-006',
    isPrimaryFeatured: false
  }
];

export const PRODUCTS = [
  {
    id: 'prod-001',
    sku: 'JAZ-COR-001',
    name: 'Corset Overbust Brocado Victoriano',
    category: 'corsets-brocado',
    categoryName: 'Corsets Brocado & Satén',
    collection: 'brocado-imperial',
    isCollectionPrimary: true,
    dropOrder: 1,
    price: 44990,
    oldPrice: 54990,
    discount: 18,
    badge: 'NUEVO DROP',
    isOffer: true,
    isNew: true,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 5.0,
    reviewsCount: 28,
    stock: 16,
    origin: 'Importación Directa',
    image_url: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
    images: [
      '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
    ],
    description: 'Corset overbust en tejido brocado floral con lazo frontal y estructura de ballenas para modelar la cintura con ajuste anatómico.',
    specs: {
      estructura: 'Ballenas flexibles y soporte anatómico',
      escote: 'Corazón con lazo de satén',
      espalda: 'Ajustable con lazada trasera'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Café Moca',
        hex: '#4B362A',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      },
      {
        name: 'Burdeos',
        hex: '#581828',
        availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
        outOfStockSizes: [],
        image: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      },
      {
        name: 'Negro',
        hex: '#111111',
        availableSizes: ['S', 'M', 'L'],
        outOfStockSizes: ['XS', 'XL'],
        image: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      },
      {
        name: 'Blanco Marfil',
        hex: '#F4F4F4',
        availableSizes: ['XS', 'S', 'M'],
        outOfStockSizes: ['L', 'XL'],
        image: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      }
    ]
  },
  {
    id: 'prod-002',
    sku: 'JAZ-COR-002',
    name: 'Corset Overbust Satén Plisado & Encaje',
    category: 'corsets-brocado',
    categoryName: 'Corsets Brocado & Satén',
    collection: 'brocado-imperial',
    isCollectionPrimary: false,
    dropOrder: 2,
    price: 42990,
    oldPrice: 52990,
    discount: 19,
    badge: 'NUEVO DROP',
    isOffer: true,
    isNew: true,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 4.9,
    reviewsCount: 21,
    stock: 12,
    origin: 'Importación Directa',
    image_url: '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg',
    images: [
      '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg'
    ],
    description: 'Corset overbust en satén plisado diagonal con borde superior de encaje delicado y corte en punta que estiliza el torso.',
    specs: {
      material: 'Satén plisado con ribete de encaje',
      corte: 'Overbust en V estilizador',
      ajuste: 'Lazada posterior regulable'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Burdeos',
        hex: '#4D192B',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg'
      },
      {
        name: 'Negro',
        hex: '#111111',
        availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
        outOfStockSizes: [],
        image: '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg'
      }
    ]
  },
  {
    id: 'prod-003',
    sku: 'JAZ-COR-003',
    name: 'Corset Overbust Lúrex Brillante',
    category: 'corsets-denim',
    categoryName: 'Corsets Denim & Lúrex',
    collection: 'denim-lurex',
    isCollectionPrimary: false,
    dropOrder: 5,
    price: 43990,
    oldPrice: 53990,
    discount: 19,
    badge: 'DESTACADO',
    isOffer: true,
    isNew: false,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 4.9,
    reviewsCount: 18,
    stock: 14,
    origin: 'Importación Directa',
    image_url: '/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg',
    images: [
      '/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg'
    ],
    description: 'Corset de noche con destellos sutiles en tejido lúrex, terminación de encaje en el escote y estructura moldeadora.',
    specs: {
      acabado: 'Tejido con destellos lúrex y encaje',
      estructura: 'Varillas moldeadoras de silueta'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Negro Brillante',
        hex: '#141414',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg'
      },
      {
        name: 'Burdeos',
        hex: '#541628',
        availableSizes: ['S', 'M', 'L', 'XL'],
        outOfStockSizes: ['XS'],
        image: '/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg'
      },
      {
        name: 'Chocolate',
        hex: '#3B2427',
        availableSizes: ['XS', 'S', 'M'],
        outOfStockSizes: ['L', 'XL'],
        image: '/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg'
      }
    ]
  },
  {
    id: 'prod-004',
    sku: 'JAZ-COR-004',
    name: 'Corset Overbust Texturizado con Lazo',
    category: 'corsets-brocado',
    categoryName: 'Corsets Brocado & Satén',
    collection: 'brocado-imperial',
    isCollectionPrimary: false,
    dropOrder: 6,
    price: 44990,
    oldPrice: null,
    discount: 0,
    badge: 'COLECCIÓN',
    isOffer: false,
    isNew: false,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 4.8,
    reviewsCount: 15,
    stock: 11,
    origin: 'Importación Directa',
    image_url: '/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg',
    images: [
      '/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg'
    ],
    description: 'Corset estructurado en tela texturizada con acabado satinado y lazo central en el busto.',
    specs: {
      material: 'Tejido texturizado de alta densidad',
      corte: 'Overbust con copas preformadas'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Plata Oscura',
        hex: '#4A4A4A',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg'
      },
      {
        name: 'Rojo Carmesí',
        hex: '#8C1D2E',
        availableSizes: ['S', 'M', 'L'],
        outOfStockSizes: ['XS', 'XL'],
        image: '/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg'
      },
      {
        name: 'Negro',
        hex: '#141414',
        availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
        outOfStockSizes: [],
        image: '/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg'
      }
    ]
  },
  {
    id: 'prod-005',
    sku: 'JAZ-COR-005',
    name: 'Corset Overbust Encaje Floral & Lazo Satén',
    category: 'corsets-encaje',
    categoryName: 'Corsets de Encaje',
    collection: 'encaje-romantico',
    isCollectionPrimary: true,
    dropOrder: 3,
    price: 45990,
    oldPrice: 56990,
    discount: 19,
    badge: 'NUEVO DROP',
    isOffer: true,
    isNew: true,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 5.0,
    reviewsCount: 31,
    stock: 18,
    origin: 'Importación Directa',
    image_url: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg',
    images: [
      '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg'
    ],
    description: 'Corset romántico confeccionado en encaje floral con varillas marcadas, ribete fruncido superior y lazo de satén en el centro.',
    specs: {
      material: 'Encaje floral sobre base estructurada',
      detalle: 'Lazo de satén y escote corazón'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Champagne',
        hex: '#DECBB3',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg'
      },
      {
        name: 'Burdeos',
        hex: '#5E1929',
        availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
        outOfStockSizes: [],
        image: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg'
      },
      {
        name: 'Negro',
        hex: '#141414',
        availableSizes: ['S', 'M', 'L'],
        outOfStockSizes: ['XS', 'XL'],
        image: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg'
      },
      {
        name: 'Blanco',
        hex: '#F5F5F5',
        availableSizes: ['XS', 'S', 'M'],
        outOfStockSizes: ['L', 'XL'],
        image: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg'
      }
    ]
  },
  {
    id: 'prod-006',
    sku: 'JAZ-COR-006',
    name: 'Corset Overbust Denim Estructurado',
    category: 'corsets-denim',
    categoryName: 'Corsets Denim & Lúrex',
    collection: 'denim-lurex',
    isCollectionPrimary: true,
    dropOrder: 7,
    price: 41990,
    oldPrice: 49990,
    discount: 16,
    badge: 'OFERTA',
    isOffer: true,
    isNew: false,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 4.9,
    reviewsCount: 19,
    stock: 15,
    origin: 'Importación Directa',
    image_url: '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg',
    images: [
      '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg'
    ],
    description: 'Corset overbust en mezclilla denim estructurada con costuras verticales definidas y lazo satinado al tono.',
    specs: {
      material: 'Denim estructurado de alto gramaje',
      corte: 'Overbust con soporte de busto'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Azul Índigo',
        hex: '#222F5B',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg'
      },
      {
        name: 'Azul Noche',
        hex: '#161E3B',
        availableSizes: ['S', 'M', 'L', 'XL'],
        outOfStockSizes: ['XS'],
        image: '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg'
      },
      {
        name: 'Celeste Denim',
        hex: '#4E6E9E',
        availableSizes: ['XS', 'S', 'M'],
        outOfStockSizes: ['L', 'XL'],
        image: '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg'
      }
    ]
  },
  {
    id: 'prod-007',
    sku: 'JAZ-COR-007',
    name: 'Corset Overbust Encaje & Lazos Laterales',
    category: 'corsets-encaje',
    categoryName: 'Corsets de Encaje',
    collection: 'encaje-romantico',
    isCollectionPrimary: false,
    dropOrder: 8,
    price: 45990,
    oldPrice: null,
    discount: 0,
    badge: 'DESTACADO',
    isOffer: false,
    isNew: false,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 4.9,
    reviewsCount: 24,
    stock: 10,
    origin: 'Importación Directa',
    image_url: '/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg',
    images: [
      '/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg'
    ],
    description: 'Corset en encaje floral con delicados lazos de satén en las caderas y el escote.',
    specs: {
      material: 'Encaje floral bordado',
      terminacion: 'Lazos laterales en cadera y busto'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Negro',
        hex: '#141414',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg'
      },
      {
        name: 'Blanco',
        hex: '#F5F5F5',
        availableSizes: ['XS', 'S', 'M'],
        outOfStockSizes: ['L', 'XL'],
        image: '/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg'
      },
      {
        name: 'Rojo & Encaje Negro',
        hex: '#6B1522',
        availableSizes: ['S', 'M', 'L', 'XL'],
        outOfStockSizes: ['XS'],
        image: '/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg'
      }
    ]
  },
  {
    id: 'prod-008',
    sku: 'JAZ-COR-008',
    name: 'Corset Manga Larga de Encaje Floral',
    category: 'corsets-mangas',
    categoryName: 'Corsets con Mangas',
    collection: 'mangas-encaje',
    isCollectionPrimary: true,
    dropOrder: 4,
    price: 49990,
    oldPrice: 59990,
    discount: 17,
    badge: 'NUEVO DROP',
    isOffer: true,
    isNew: true,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 5.0,
    reviewsCount: 34,
    stock: 12,
    origin: 'Importación Directa',
    image_url: '/catalogo/IMG_8375.jpeg',
    images: [
      '/catalogo/IMG_8375.jpeg'
    ],
    description: 'Corset estructurado con mangas largas de encaje traslúcido, escote corazón con lazo central y varillas estilizadas.',
    specs: {
      mangas: 'Manga larga en encaje floral',
      estructura: 'Corpiño estructurado con varillas'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Negro',
        hex: '#111111',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/IMG_8375.jpeg'
      },
      {
        name: 'Blanco',
        hex: '#F5F5F5',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/IMG_8375.jpeg'
      },
      {
        name: 'Burdeos',
        hex: '#6E141E',
        availableSizes: ['S', 'M', 'L'],
        outOfStockSizes: ['XS', 'XL'],
        image: '/catalogo/IMG_8375.jpeg'
      }
    ]
  },
  {
    id: 'prod-009',
    sku: 'JAZ-COR-009',
    name: 'Corset Manga Larga de Encaje Romántico',
    category: 'corsets-mangas',
    categoryName: 'Corsets con Mangas',
    collection: 'mangas-encaje',
    isCollectionPrimary: false,
    dropOrder: 9,
    price: 49990,
    oldPrice: 59990,
    discount: 17,
    badge: 'COLECCIÓN',
    isOffer: true,
    isNew: false,
    isFeatured: true,
    is_active: true,
    is_featured: true,
    rating: 4.9,
    reviewsCount: 22,
    stock: 9,
    origin: 'Importación Directa',
    image_url: '/catalogo/IMG_8376.jpeg',
    images: [
      '/catalogo/IMG_8376.jpeg'
    ],
    description: 'Corset con mangas largas de encaje fino en tonos suaves y clásicos, diseñado para estilizar la figura con elegancia.',
    specs: {
      mangas: 'Manga larga en encaje romántico',
      estructura: 'Corpiño moldeador en V'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Negro',
        hex: '#111111',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: '/catalogo/IMG_8376.jpeg'
      },
      {
        name: 'Blanco',
        hex: '#F5F5F5',
        availableSizes: ['XS', 'S', 'M'],
        outOfStockSizes: ['L', 'XL'],
        image: '/catalogo/IMG_8376.jpeg'
      },
      {
        name: 'Champagne',
        hex: '#DFCBB5',
        availableSizes: ['S', 'M', 'L'],
        outOfStockSizes: ['XS', 'XL'],
        image: '/catalogo/IMG_8376.jpeg'
      }
    ]
  }
];

export const SHIPPING_TABLE_DATA = [
  {
    region: 'Región Metropolitana',
    zonas: 'Santiago Centro, Providencia, Las Condes, Ñuñoa, Maipú, La Florida, Puente Alto, Vitacura...',
    courier: 'Courier Express / Starken',
    plazo: '24 a 48 hrs hábiles',
    costo: 3990,
    gratisDesde: 60000
  },
  {
    region: 'Zona Centro (Valparaíso / O\'Higgins / Maule)',
    zonas: 'Viña del Mar, Valparaíso, Rancagua, Talca, Quilpué, Curicó, San Antonio...',
    courier: 'Starken / Chilexpress / Blue Express',
    plazo: '1 a 3 días hábiles',
    costo: 4990,
    gratisDesde: 60000
  },
  {
    region: 'Zona Sur (Biobío / Araucanía / Los Ríos / Los Lagos)',
    zonas: 'Concepción, Temuco, Valdivia, Puerto Montt, Osorno, Chillán, Los Ángeles, Castro...',
    courier: 'Starken / Chilexpress',
    plazo: '2 a 4 días hábiles',
    costo: 5490,
    gratisDesde: 60000
  },
  {
    region: 'Zona Norte (Coquimbo / Antofagasta / Tarapacá / Arica)',
    zonas: 'La Serena, Antofagasta, Iquique, Arica, Calama, Copiapó, Ovalle...',
    courier: 'Chilexpress Prioritario / Starken',
    plazo: '2 a 4 días hábiles',
    costo: 6490,
    gratisDesde: 60000
  },
  {
    region: 'Zona Austral (Aysén / Magallanes)',
    zonas: 'Punta Arenas, Coyhaique, Puerto Natales, Puerto Aysén, Porvenir...',
    courier: 'Chilexpress Aéreo / Starken',
    plazo: '3 a 5 días hábiles',
    costo: 7990,
    gratisDesde: 60000
  }
];

export const CHILE_REGIONS = [
  { id: 'rm', name: 'Región Metropolitana de Santiago', shippingCost: 3990 },
  { id: 'valpo', name: 'Región de Valparaíso', shippingCost: 4990 },
  { id: 'biobio', name: 'Región del Biobío', shippingCost: 5490 },
  { id: 'coquimbo', name: 'Región de Coquimbo', shippingCost: 5490 },
  { id: 'antofagasta', name: 'Región de Antofagasta', shippingCost: 6490 },
  { id: 'los-lagos', name: 'Región de Los Lagos', shippingCost: 5490 },
  { id: 'magallanes', name: 'Región de Magallanes', shippingCost: 7990 },
  { id: 'otras', name: 'Otras Regiones de Chile', shippingCost: 5490 }
];

export const CLIENT_REVIEWS = [
  {
    id: 1,
    name: 'Valentina R.',
    city: 'Las Condes, Santiago',
    rating: 5,
    date: 'Hace 3 días',
    productName: 'Corset Overbust Brocado Victoriano',
    comment: '¡Quedé enamorada de la calidad! Realmente moldea y estiliza la cintura sin incomodar. Llegó en 24 hrs a Santiago.',
    avatar: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
  },
  {
    id: 2,
    name: 'Camila S.',
    city: 'Viña del Mar',
    rating: 5,
    date: 'Hace 1 semana',
    productName: 'Corset Overbust Satén Plisado & Encaje',
    comment: 'La tela es hermosa y suave. La guía de tallas es exacta; medí mi cintura y la talla S me quedó perfecta.',
    avatar: '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg'
  },
  {
    id: 3,
    name: 'Javiera M.',
    city: 'Concepción',
    rating: 5,
    date: 'Hace 2 semanas',
    productName: 'Corset Manga Larga de Encaje Floral',
    comment: 'Lo usé para un evento especial y se robó todas las miradas. El encaje de las mangas tiene una terminación impecable.',
    avatar: '/catalogo/IMG_8375.jpeg'
  },
  {
    id: 4,
    name: 'Constanza P.',
    city: 'Providencia, Santiago',
    rating: 5,
    date: 'Hace 3 semanas',
    productName: 'Corset Overbust Encaje Floral & Lazo Satén',
    comment: 'Atención de diez por WhatsApp, me asesoraron rápido con las medidas antes de comprar.',
    avatar: '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg'
  }
];

export const FAQ_ITEMS = [
  {
    question: "¿Cómo sé cuál es mi talla correcta de corset?",
    answer: "Para corsets de reducción, mide tu cintura natural en la parte más estrecha (2 a 3 cm sobre el ombligo). Elige una talla que corresponda a 5 a 8 cm menos que tu medida real si buscas reducción de silueta, o tu medida exacta para comodidad. Contamos con guía interactiva de medidas."
  },
  {
    question: "¿Las ballenas de los corsets son de plástico o de acero?",
    answer: "Nuestras prendas son de importación de alta gama y utilizan estructuras firmes que garantizan que no se doblen ni se deformen con el uso y mantengan una postura estilizada."
  },
  {
    question: "¿Cuánto demoran los envíos dentro de Chile?",
    answer: "En la Región Metropolitana despachamos en 24 a 48 horas hábiles. Para regiones de norte a sur de Chile, la entrega vía Starken, Chilexpress o Blue Express es de 1 a 4 días hábiles según la zona."
  },
  {
    question: "¿Qué medios de pago aceptan?",
    answer: "Aceptamos tarjetas de débito y crédito a través de Webpay Plus (Transbank), Mercado Pago, Flow (hasta 6 cuotas sin interés) y Transferencia Bancaria Directa con confirmación por WhatsApp."
  },
  {
    question: "¿Tienen cambios de talla?",
    answer: "Sí, dispones de 10 días desde recibido tu pedido para solicitar cambio de talla. Te asesoramos directamente por nuestro WhatsApp +56 9 4018 7563."
  }
];

export const SIZE_CHART = [
  { size: 'XS', busto: '76 - 82 cm', cintura: '56 - 62 cm', cadera: '82 - 88 cm' },
  { size: 'S', busto: '82 - 88 cm', cintura: '62 - 68 cm', cadera: '88 - 94 cm' },
  { size: 'M', busto: '88 - 94 cm', cintura: '68 - 74 cm', cadera: '94 - 100 cm' },
  { size: 'L', busto: '94 - 100 cm', cintura: '74 - 80 cm', cadera: '100 - 106 cm' },
  { size: 'XL', busto: '100 - 108 cm', cintura: '80 - 88 cm', cadera: '106 - 114 cm' },
  { size: 'XXL', busto: '108 - 116 cm', cintura: '88 - 96 cm', cadera: '114 - 122 cm' },
];

export const BRAND_POLICIES = {
  returns: {
    title: "Políticas de Cambios y Devoluciones",
    badge: "10 Días de Garantía",
    points: [
      "Dispones de 10 días corridos desde recibido el paquete para solicitar cambio de talla o modelo.",
      "La prenda debe entregarse sin signos de uso, sin perfumes, sin lavado y con todas sus etiquetas y empaques originales intactos.",
      "Debido a la naturaleza estructurada y modeladora de la corsetería, prendas que presenten desgaste o deformación por mal uso no aplican para cambio.",
      "Atención y gestión inmediata por nuestro canal de WhatsApp (+56 9 4018 7563) con tu número de orden."
    ]
  },
  shipping: {
    title: "Políticas de Despacho & Cobertura",
    badge: "Todo Chile",
    points: [
      "Región Metropolitana: Despacho prioritario en 24 a 48 horas hábiles.",
      "Regiones de Chile: Despacho por Starken, Chilexpress y Blue Express en 1 a 4 días hábiles.",
      "Envío GRATIS automático en todas las compras a partir de $60.000 CLP.",
      "Cada pedido se despacha con código de rastreo en línea y embalaje reforzado y discreto."
    ]
  },
  warranty: {
    title: "Garantía de Corsetería",
    badge: "Calidad Garantizada",
    points: [
      "Estructuras reforzadas que estilizan y moldean tu cintura con ajuste ergonómico.",
      "Reducción de cintura cómoda con lazada trasera regulable.",
      "Costuras de alta resistencia y brocados finos de importación directa."
    ]
  }
};

export const ORDER_STAGES = [
  {
    id: 'recibido',
    step: 1,
    label: 'Pedido Recibido',
    shortLabel: 'Recibido',
    description: 'Tu orden fue confirmada y registrada en nuestro sistema.'
  },
  {
    id: 'preparacion',
    step: 2,
    label: 'En Preparación & Control',
    shortLabel: 'En Preparación',
    description: 'Estamos revisando costuras, ojetillos y preparando tu corset.'
  },
  {
    id: 'empacado',
    step: 3,
    label: 'Empaque Discreto Listo',
    shortLabel: 'Empacado',
    description: 'Tu prenda fue embalada en caja sellada y asignada al courier.'
  },
  {
    id: 'en_camino',
    step: 4,
    label: 'En Camino a tu Dirección',
    shortLabel: 'En Camino',
    description: 'El paquete fue despachado por el courier hacia tu comuna.'
  },
  {
    id: 'entregado',
    step: 5,
    label: 'Pedido Entregado',
    shortLabel: 'Entregado',
    description: 'El pedido fue entregado exitosamente en destino.'
  }
];
