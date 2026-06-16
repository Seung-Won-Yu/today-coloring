var ARTWORK_VERSION = '14';
var ARTWORK_COUNT = 60;

var THEME_HINTS = {
  '컬러링': '오늘의 추천 작품'
};

function padArtworkNumber(num) {
  return String(num).padStart(2, '0');
}

function createVerticalArtwork(num) {
  var label = padArtworkNumber(num);
  var file = 'vertical-' + label + '.png';
  return {
    id: 'vertical-' + label,
    title: '오늘의 그림 ' + label,
    category: '컬러링',
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

window.CATEGORIES = ['전체'].concat(Object.keys(THEME_HINTS));
