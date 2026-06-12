var THEME_HINTS = {
  '집과 정원': '포근한 풍경',
  '꽃과 그릇': '꽃무늬 장식',
  '전통 소품': '전통 꾸미기',
  '먹거리': '맛있는 한 상',
  '동물': '귀여운 친구',
  '자연 풍경': '시원한 풍경'
};

var ARTWORK_CATALOG = [
  ['easy_cozy_house', '아늑한 집', '집과 정원', 'easy_cozy_house.png'],
  ['easy_lotus_moon_jar', '연꽃 달항아리', '꽃과 그릇', 'easy_lotus_moon_jar.png'],
  ['easy_lucky_pouch', '모란 복주머니', '전통 소품', 'easy_lucky_pouch.png'],
  ['easy_tea_table', '다과상', '먹거리', 'easy_tea_table.png'],
  ['medium_hanok_gate_pots', '꽃화분 한옥문', '집과 정원', 'medium_hanok_gate_pots.png'],
  ['medium_persimmon_basket', '감 바구니', '먹거리', 'medium_persimmon_basket.png'],
  ['medium_lotus_bowl', '연꽃 수반', '꽃과 그릇', 'medium_lotus_bowl.png'],
  ['medium_sewing_basket', '반짇고리', '전통 소품', 'medium_sewing_basket.png'],
  ['medium_picnic_set', '나들이 도시락', '먹거리', 'medium_picnic_set.png'],
  ['animal_butterfly', '나비', '동물', 'animal_butterfly.png'],
  ['animal_goldfish', '금붕어', '동물', 'animal_goldfish.png'],
  ['animal_elephant', '아기 코끼리', '동물', 'animal_elephant.png'],
  ['animal_owl', '부엉이', '동물', 'animal_owl.png'],
  ['traditional_plum_fan', '매화 부채', '전통 소품', 'traditional_plum_fan.png'],
  ['animal_puppy', '강아지', '동물', 'animal_puppy.png'],
  ['scene_cottage', '초가집', '집과 정원', 'scene_cottage.png'],
  ['animal_turtle', '바다거북', '동물', 'animal_turtle.png'],
  ['scene_mountain', '산과 해', '자연 풍경', 'scene_mountain.png'],
  ['flower_hibiscus', '무궁화', '꽃과 그릇', 'flower_hibiscus.png']
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
    src: 'assets/images/artworks/' + file + '?v=1',
    isCanvas: true,
    guide: []
  };
});

window.CATEGORIES = ['전체'].concat(Object.keys(THEME_HINTS));
