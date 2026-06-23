var ARTWORK_VERSION = '1';
var ARTWORK_SAVE_VERSION = '1';
var ARTWORK_IDS = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37', '38', '39', '40'
];
var ARTWORK_COUNT = ARTWORK_IDS.length;

var CATEGORY_ORDER = ['꽃과 식물', '동물과 자연', '일상 소품', '전통과 공예', '풍경 여행'];

var THEME_HINTS = {
  '꽃과 식물': '꽃과 잎',
  '동물과 자연': '동물과 숲',
  '일상 소품': '일상 소품',
  '전통과 공예': '전통 공예',
  '풍경 여행': '여행 풍경'
};

var ARTWORK_META = {
  '01': { title: '초원의 양', category: '동물과 자연', difficulty: 'normal' },
  '02': { title: '대나무 숲 아기 판다', category: '동물과 자연', difficulty: 'easy' },
  '03': { title: '초원의 젖소', category: '동물과 자연', difficulty: 'hard' },
  '04': { title: '바다 고래', category: '동물과 자연', difficulty: 'easy' },
  '05': { title: '농장의 병아리', category: '동물과 자연', difficulty: 'normal' },
  '06': { title: '바다거북의 유영', category: '동물과 자연', difficulty: 'hard' },
  '07': { title: '한 송이 장미', category: '꽃과 식물', difficulty: 'easy' },
  '08': { title: '바닷속 해파리', category: '동물과 자연', difficulty: 'hard' },
  '09': { title: '해 뜨는 산길', category: '풍경 여행', difficulty: 'hard' },
  '10': { title: '고즈넉한 한옥', category: '전통과 공예', difficulty: 'easy' },
  '11': { title: '장화 신은 아기 돼지', category: '동물과 자연', difficulty: 'hard' },
  '12': { title: '창가의 축음기', category: '일상 소품', difficulty: 'normal' },
  '13': { title: '유칼립투스 코알라', category: '동물과 자연', difficulty: 'hard', requiresVersionedSave: true },
  '14': { title: '찻상의 다기', category: '일상 소품', difficulty: 'easy' },
  '15': { title: '달빛 장식', category: '전통과 공예', difficulty: 'hard' },
  '16': { title: '왕관 장식', category: '전통과 공예', difficulty: 'normal' },
  '17': { title: '나무 탈 장식', category: '전통과 공예', difficulty: 'easy' },
  '18': { title: '감나무 열매', category: '꽃과 식물', difficulty: 'easy', requiresVersionedSave: true },
  '19': { title: '물 위의 연꽃', category: '꽃과 식물', difficulty: 'normal' },
  '20': { title: '대나무 아래 판다', category: '동물과 자연', difficulty: 'hard' },
  '21': { title: '들판의 해바라기', category: '꽃과 식물', difficulty: 'normal' },
  '22': { title: '햇살 아래 고래', category: '동물과 자연', difficulty: 'hard' },
  '23': { title: '도토리 다람쥐', category: '동물과 자연', difficulty: 'easy' },
  '24': { title: '초원의 코끼리', category: '동물과 자연', difficulty: 'normal' },
  '25': { title: '정원의 공작', category: '동물과 자연', difficulty: 'hard' },
  '26': { title: '대나무 숲 판다', category: '동물과 자연', difficulty: 'hard' },
  '27': { title: '장미 잎 장식', category: '꽃과 식물', difficulty: 'easy' },
  '28': { title: '마당의 항아리', category: '전통과 공예', difficulty: 'easy' },
  '29': { title: '버섯 아래 아기 여우', category: '동물과 자연', difficulty: 'easy' },
  '30': { title: '리본 꽃다발', category: '꽃과 식물', difficulty: 'easy' },
  '31': { title: '생일 케이크', category: '일상 소품', difficulty: 'normal' },
  '32': { title: '정원의 토끼 친구들', category: '동물과 자연', difficulty: 'normal' },
  '33': { title: '바닷속 친구들', category: '동물과 자연', difficulty: 'easy' },
  '34': { title: '소풍 곰 인형', category: '일상 소품', difficulty: 'hard' },
  '35': { title: '노을 열기구', category: '풍경 여행', difficulty: 'hard' },
  '36': { title: '해변의 돛단배', category: '풍경 여행', difficulty: 'normal' },
  '37': { title: '사막의 선인장', category: '꽃과 식물', difficulty: 'normal' },
  '38': { title: '가을 고슴도치', category: '동물과 자연', difficulty: 'easy' },
  '39': { title: '전통 놀이 소품', category: '전통과 공예', difficulty: 'normal' },
  '40': { title: '겨울 눈사람', category: '풍경 여행', difficulty: 'normal' }
};

function padArtworkNumber(num) {
  return String(num).padStart(2, '0');
}

function createVerticalArtwork(num) {
  var label = padArtworkNumber(num);
  var file = 'vertical-' + label + '.webp';
  var meta = ARTWORK_META[label] || { title: '작품 ' + label, category: '꽃과 식물' };
  var version = meta.version || ARTWORK_SAVE_VERSION;
  return {
    id: 'vertical-' + label,
    title: meta.title,
    category: meta.category,
    difficulty: meta.difficulty || 'normal',
    version: version,
    requiresVersionedSave: Boolean(meta.requiresVersionedSave),
    src: 'assets/images/artworks/' + file + '?v=' + (meta.version || ARTWORK_VERSION),
    thumbSrc: 'assets/images/thumbs/' + file + '?v=' + (meta.version || ARTWORK_VERSION),
    regionMapSrc: 'assets/regionmaps/paint/' + file.replace('.webp', '.png') + '?v=' + (meta.version || ARTWORK_VERSION),
    lineLayerSrc: 'assets/linelayers/paint/' + file.replace('.webp', '.png') + '?v=' + (meta.version || ARTWORK_VERSION),
    isCanvas: true,
    layout: 'portrait',
    guide: []
  };
}

window.ARTWORKS = ARTWORK_IDS.map(function(label) {
  return createVerticalArtwork(Number(label));
});
window.ALL_ARTWORKS = window.ARTWORKS;
window.ARTWORK_VERSION = ARTWORK_VERSION;
window.ARTWORK_SAVE_VERSION = ARTWORK_SAVE_VERSION;

window.CATEGORIES = ['전체'].concat(CATEGORY_ORDER);
