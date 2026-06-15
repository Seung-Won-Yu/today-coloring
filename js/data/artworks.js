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
  ['cat', '고양이', '동물', 'cat.png'],
  ['deer', '사슴', '동물', 'deer.png'],
  ['hippo', '하마', '동물', 'hippo.png'],
  ['vase', '화병', '꽃과 그릇', 'vase.png'],
  ['lotus', '연꽃', '꽃과 그릇', 'lotus.png'],
  ['sunflower', '해바라기', '꽃과 그릇', 'sunflower.png'],
  ['jars', '항아리', '전통 소품', 'jars.png'],
  ['watermill', '물레방아', '자연 풍경', 'watermill.png'],
  ['fan', '부채', '전통 소품', 'fan.png'],
  ['mask', '탈', '전통 소품', 'mask.png'],
  ['janggu', '장구', '전통 소품', 'janggu.png']
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
