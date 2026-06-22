var ARTWORK_VERSION = '22';
var ARTWORK_SAVE_VERSION = '20';
var ARTWORK_IDS = [
  '15', '17', '40', '43', '11', '50', '41', '59', '46', '29',
  '13', '05', '14', '21', '28', '55', '34', '60', '22', '31',
  '38', '58', '53', '48', '54', '10', '49', '37', '61', '62',
  '63', '64', '65', '66', '67', '68', '69', '70', '71', '72'
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
  '05': { title: '창가의 축음기', category: '일상 소품' },
  '10': { title: '대나무 숲 판다', category: '동물과 자연' },
  '11': { title: '농장의 병아리', category: '동물과 자연' },
  '13': { title: '장화 신은 아기 돼지', category: '동물과 자연' },
  '14': { title: '유칼립투스 코알라', category: '동물과 자연', requiresVersionedSave: true },
  '15': { title: '초원의 양', category: '동물과 자연' },
  '17': { title: '대나무 숲 아기 판다', category: '동물과 자연' },
  '21': { title: '찻상의 다기', category: '일상 소품' },
  '22': { title: '물 위의 연꽃', category: '꽃과 식물' },
  '28': { title: '달빛 장식', category: '전통과 공예' },
  '29': { title: '고즈넉한 한옥', category: '전통과 공예' },
  '31': { title: '대나무 아래 판다', category: '동물과 자연' },
  '34': { title: '나무 탈 장식', category: '전통과 공예' },
  '37': { title: '마당의 항아리', category: '전통과 공예' },
  '38': { title: '들판의 해바라기', category: '꽃과 식물' },
  '40': { title: '초원의 젖소', category: '동물과 자연' },
  '41': { title: '한 송이 장미', category: '꽃과 식물' },
  '43': { title: '바다 고래', category: '동물과 자연' },
  '46': { title: '해 뜨는 산길', category: '풍경 여행' },
  '48': { title: '초원의 코끼리', category: '동물과 자연' },
  '49': { title: '장미 잎 장식', category: '꽃과 식물' },
  '50': { title: '바다거북의 유영', category: '동물과 자연' },
  '53': { title: '도토리 다람쥐', category: '동물과 자연' },
  '54': { title: '정원의 공작', category: '동물과 자연' },
  '55': { title: '왕관 장식', category: '전통과 공예' },
  '58': { title: '햇살 아래 고래', category: '동물과 자연' },
  '59': { title: '바닷속 해파리', category: '동물과 자연' },
  '60': { title: '감나무 열매', category: '꽃과 식물', requiresVersionedSave: true },
  '61': { title: '버섯 아래 아기 여우', category: '동물과 자연' },
  '62': { title: '리본 꽃다발', category: '꽃과 식물' },
  '63': { title: '생일 케이크', category: '일상 소품' },
  '64': { title: '정원의 토끼 친구들', category: '동물과 자연' },
  '65': { title: '바닷속 친구들', category: '동물과 자연' },
  '66': { title: '소풍 곰 인형', category: '일상 소품' },
  '67': { title: '노을 열기구', category: '풍경 여행' },
  '68': { title: '해변의 돛단배', category: '풍경 여행' },
  '69': { title: '사막의 선인장', category: '꽃과 식물' },
  '70': { title: '가을 고슴도치', category: '동물과 자연' },
  '71': { title: '전통 놀이 소품', category: '전통과 공예' },
  '72': { title: '겨울 눈사람', category: '풍경 여행' }
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
