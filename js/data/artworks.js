var THEME_HINTS = {
  '집과 정원': '포근한 풍경',
  '꽃과 그릇': '꽃무늬 장식',
  '전통 소품': '전통 꾸미기',
  '먹거리': '맛있는 한 상',
  '동물': '귀여운 친구',
  '자연 풍경': '시원한 풍경'
};

var ARTWORK_CATALOG = [
  ['squirrel', '다람쥐', '동물', 'squirrel.png'],
  ['whale', '고래', '동물', 'whale.png'],
  ['sunflower', '해바라기', '꽃과 그릇', 'sunflower.png'],
  ['jars', '항아리', '전통 소품', 'jars.png'],
  ['fan', '부채', '전통 소품', 'fan.png'],
  ['fruit_basket', '과일 바구니', '먹거리', 'fruit-basket.png'],
  ['dragon_mask', '용탈', '전통 소품', 'dragon-mask.png'],
  ['crane', '두루미', '동물', 'crane.png'],
  ['janggu', '장구', '전통 소품', 'janggu.png'],
  ['butterfly', '나비', '동물', 'butterfly.png'],
  ['turtle', '바다거북', '동물', 'turtle.png'],
  ['peacock', '공작새', '동물', 'peacock.png'],
  ['owl', '부엉이', '동물', 'owl.png'],
  ['goldfish', '금붕어', '동물', 'goldfish.png'],
  ['mandala_flower', '꽃 만다라', '꽃과 그릇', 'mandala-flower.png']
];

window.ARTWORKS = ARTWORK_CATALOG.map(function(entry) {
  var id = entry[0];
  var title = entry[1];
  var category = entry[2];
  var file = entry[3];
  return {
    id: id,
    title: title,
    category: category,
    src: 'assets/images/artworks/' + file + '?v=13',
    thumbSrc: 'assets/images/thumbs/' + file + '?v=13',
    isCanvas: true,
    layout: null,
    guide: []
  };
});

window.CATEGORIES = ['전체'].concat(Object.keys(THEME_HINTS));
