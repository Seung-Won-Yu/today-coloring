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
  ['flower_hibiscus', '무궁화', '꽃과 그릇', 'flower_hibiscus.png'],
  ['easy_birdhouse_garden', '새집 정원', '집과 정원', 'easy_birdhouse_garden.png'],
  ['easy_fruit_bowl', '과일 그릇', '먹거리', 'easy_fruit_bowl.png'],
  ['easy_flower_umbrella', '꽃 우산', '꽃과 그릇', 'easy_flower_umbrella.png'],
  ['easy_rabbit_clover', '토끼와 클로버', '동물', 'easy_rabbit_clover.png'],
  ['easy_sailboat_sun', '돛단배와 해', '자연 풍경', 'easy_sailboat_sun.png'],
  ['medium_korean_lantern', '전통 등', '전통 소품', 'medium_korean_lantern.png'],
  ['medium_snack_plate', '간식 접시', '먹거리', 'medium_snack_plate.png'],
  ['medium_garden_tools', '정원 도구', '집과 정원', 'medium_garden_tools.png'],
  ['medium_koi_pond', '잉어 연못', '동물', 'medium_koi_pond.png'],
  ['medium_pine_mountain', '소나무 산길', '자연 풍경', 'medium_pine_mountain.png'],
  ['flower_camellia_pot', '동백 화분', '꽃과 그릇', 'flower_camellia_pot.png']
];

var ARTWORK_LAYOUT = {
  'medium_pine_mountain': { scale: 0.9, y: 54 },
  'medium_snack_plate': { scale: 0.94, x: -46 },
  'medium_korean_lantern': { scale: 0.96 },
  'scene_cottage': { scale: 0.92, x: -12 }
};

window.ARTWORKS = ARTWORK_CATALOG.map(function(entry) {
  var id = entry[0];
  var title = entry[1];
  var category = entry[2];
  var file = entry[3];
  return {
    id: id,
    title: title,
    category: category,
    src: 'assets/images/artworks/' + file + '?v=6',
    isCanvas: true,
    layout: ARTWORK_LAYOUT[id] || null,
    guide: []
  };
});

window.CATEGORIES = ['전체'].concat(Object.keys(THEME_HINTS));
