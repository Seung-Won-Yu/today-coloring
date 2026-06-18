var ARTWORK_VERSION = '14';
var ARTWORK_COUNT = 60;

var CATEGORY_ORDER = ['꽃과 식물', '동물과 자연', '일상 소품', '전통과 공예', '풍경 여행'];

var THEME_HINTS = {
  '꽃과 식물': '꽃과 잎',
  '동물과 자연': '동물과 숲',
  '일상 소품': '일상 소품',
  '전통과 공예': '전통 공예',
  '풍경 여행': '여행 풍경'
};

var ARTWORK_META = {
  '01': { title: '꽃다발의 오후', category: '꽃과 식물' },
  '02': { title: '거실의 괘종시계', category: '일상 소품' },
  '03': { title: '나무 책상의 전화기', category: '일상 소품' },
  '04': { title: '작업실 재봉틀', category: '일상 소품' },
  '05': { title: '창가의 축음기', category: '일상 소품' },
  '06': { title: '구름 위 열기구', category: '풍경 여행' },
  '07': { title: '작은 소나무 분재', category: '꽃과 식물' },
  '08': { title: '가을 수확 바구니', category: '일상 소품' },
  '09': { title: '연못의 오리', category: '동물과 자연' },
  '10': { title: '대나무 숲 판다', category: '동물과 자연' },
  '11': { title: '농장의 병아리', category: '동물과 자연' },
  '12': { title: '꽃을 든 코끼리', category: '동물과 자연' },
  '13': { title: '장화 신은 아기 돼지', category: '동물과 자연' },
  '14': { title: '유칼립투스 코알라', category: '동물과 자연' },
  '15': { title: '초원의 양', category: '동물과 자연' },
  '16': { title: '주방의 양파 바구니', category: '일상 소품' },
  '17': { title: '대나무 숲 아기 판다', category: '동물과 자연' },
  '18': { title: '처마 밑 곶감', category: '전통과 공예' },
  '19': { title: '처마 아래 등롱', category: '전통과 공예' },
  '20': { title: '숲속 곰 인형', category: '동물과 자연' },
  '21': { title: '찻상의 다기', category: '일상 소품' },
  '22': { title: '물 위의 연꽃', category: '꽃과 식물' },
  '23': { title: '가을 다람쥐', category: '동물과 자연' },
  '24': { title: '정원의 강아지', category: '동물과 자연' },
  '25': { title: '실타래 고양이', category: '동물과 자연' },
  '26': { title: '노을 속 두루미', category: '동물과 자연' },
  '27': { title: '꽃밭의 강아지', category: '동물과 자연' },
  '28': { title: '달빛 장식', category: '전통과 공예' },
  '29': { title: '고즈넉한 한옥', category: '전통과 공예' },
  '30': { title: '꽃병의 잔가지', category: '꽃과 식물' },
  '31': { title: '대나무 아래 판다', category: '동물과 자연' },
  '32': { title: '물결 속 금붕어', category: '동물과 자연' },
  '33': { title: '정원의 무궁화', category: '꽃과 식물' },
  '34': { title: '나무 탈 장식', category: '전통과 공예' },
  '35': { title: '북 장식', category: '전통과 공예' },
  '36': { title: '밤하늘 부엉이', category: '동물과 자연' },
  '37': { title: '마당의 항아리', category: '전통과 공예' },
  '38': { title: '들판의 해바라기', category: '꽃과 식물' },
  '39': { title: '부채와 매듭', category: '전통과 공예' },
  '40': { title: '초원의 젖소', category: '동물과 자연' },
  '41': { title: '한 송이 장미', category: '꽃과 식물' },
  '42': { title: '잎사귀 장미', category: '꽃과 식물' },
  '43': { title: '바다 고래', category: '동물과 자연' },
  '44': { title: '따뜻한 찻주전자', category: '일상 소품' },
  '45': { title: '숲길의 반려견', category: '동물과 자연' },
  '46': { title: '해 뜨는 산길', category: '풍경 여행' },
  '47': { title: '갈대밭 왜가리', category: '동물과 자연' },
  '48': { title: '초원의 코끼리', category: '동물과 자연' },
  '49': { title: '장미 잎 장식', category: '꽃과 식물' },
  '50': { title: '바다거북의 유영', category: '동물과 자연' },
  '51': { title: '물가의 오리', category: '동물과 자연' },
  '52': { title: '연못가 정자', category: '풍경 여행' },
  '53': { title: '도토리 다람쥐', category: '동물과 자연' },
  '54': { title: '정원의 공작', category: '동물과 자연' },
  '55': { title: '왕관 장식', category: '전통과 공예' },
  '56': { title: '가을 숲 호랑이', category: '동물과 자연' },
  '57': { title: '격자무늬 다기', category: '일상 소품' },
  '58': { title: '햇살 아래 고래', category: '동물과 자연' },
  '59': { title: '바닷속 해파리', category: '동물과 자연' },
  '60': { title: '감나무 열매', category: '꽃과 식물' }
};

function padArtworkNumber(num) {
  return String(num).padStart(2, '0');
}

function createVerticalArtwork(num) {
  var label = padArtworkNumber(num);
  var file = 'vertical-' + label + '.png';
  var meta = ARTWORK_META[label] || { title: '작품 ' + label, category: '꽃과 식물' };
  return {
    id: 'vertical-' + label,
    title: meta.title,
    category: meta.category,
    src: 'assets/images/artworks/' + file + '?v=' + ARTWORK_VERSION,
    thumbSrc: 'assets/images/thumbs/' + file + '?v=' + ARTWORK_VERSION,
    isCanvas: true,
    layout: 'portrait',
    guide: []
  };
}

window.ARTWORKS = Array.from({ length: ARTWORK_COUNT }, function(_, index) {
  return createVerticalArtwork(index + 1);
});

window.CATEGORIES = ['전체'].concat(CATEGORY_ORDER);
