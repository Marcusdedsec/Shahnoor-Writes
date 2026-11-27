import { CategoryInfo } from '../types/editorial';

export const HERO_KASHMIR_IMAGE = '/src/assets/images/hero_kashmir_dawn_1795777702725.jpg';
export const AUTHOR_ILLUSTRATION_IMAGE = '/src/assets/images/kashmir_literary_illustration_1795779406756.jpg';

export const CURATED_GALLERY_IMAGES = [
  {
    label: 'Dal Lake Dawn & Shikara',
    url: '/src/assets/images/hero_kashmir_dawn_1795777702725.jpg',
  },
  {
    label: 'Chinar Leaves on Carved Walnut',
    url: '/src/assets/images/essay_chinar_autumn_1795777700943.jpg',
  },
  {
    label: 'Pinjrakari Lattice Window',
    url: '/src/assets/images/essay_walnut_window_1795777702810.jpg',
  },
  {
    label: 'Morning Kahwa & Writing Desk',
    url: '/src/assets/images/essay_solitude_tea_1795777703780.jpg',
  },
  {
    label: 'Handmade Paper & Qalamdan',
    url: '/src/assets/images/essay_manuscript_paper_1795777703938.jpg',
  },
];

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'essays',
    name: 'Essays',
    slug: 'essays',
    description: 'Long-form meditations on literature, memory, craft, and the inner life.',
    accent: '#9C443B',
  },
  {
    id: 'personal-reflections',
    name: 'Personal Reflections',
    slug: 'personal-reflections',
    description: 'Intimate notebook entries written in quiet mornings and changing seasons.',
    accent: '#493528',
  },
  {
    id: 'stories',
    name: 'Stories',
    slug: 'stories',
    description: 'Narrative prose, portraits of place, and vignettes from valleys and cities.',
    accent: '#485B47',
  },
  {
    id: 'opinions',
    name: 'Opinions',
    slug: 'opinions',
    description: 'Considered perspectives on culture, language, attention, and modern life.',
    accent: '#B59A65',
  },
  {
    id: 'culture',
    name: 'Culture',
    slug: 'culture',
    description: 'Explorations of Kashmiri heritage, artisanal craft, architecture, and poetry.',
    accent: '#9C443B',
  },
  {
    id: 'life-and-philosophy',
    name: 'Life & Philosophy',
    slug: 'life-and-philosophy',
    description: 'Contemplations on solitude, time, presence, and living with intention.',
    accent: '#485B47',
  },
];
