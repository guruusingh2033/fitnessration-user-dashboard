(function() {
  function contains(parent, descendant) {
      return parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);
  }
  document.addEventListener('animationstart', function(event) {
    if (event.animationName == 'background-image') {
      var el = $(event.target);
      var prevBackgroundImage = el.attr('data-background-image');
      var prevColors = el.css('background-image');

      function update() {
        el.css('background-image', 'url("' + IMAGE_SERVER_URL + '/image.php?image=' + el.attr('data-background-image') + '&' + colorStr + '")');
      }

      function upateColors() {
        var matches = el.css('list-style-image').match(/\?([^")]*)/);
        var colors = {};
        if (matches) {
          var parts = matches[1].split('&');
          for (var i = 0; i < parts.length; ++ i) {
            var colorParts = parts[i].split('=');
            colors[colorParts[0]] = colorParts[1];
          }
        }
        colorStr = [];
        for (var originalColor in colors) {
          if (originalColor) {
            colorStr.push('color[' + originalColor + ']=' + colors[originalColor]);              
          }
        }
        colorStr = colorStr.join('&');
        el.data('colors', colorStr);
      }

      var colorStr = '';
      if (el.data('colors')) {
        colorStr = el.data('colors');
      }
      else {
        upateColors();
      }
      update();

      var timerId = setInterval(function() {
        if (contains(document, el[0])) {
          var shouldUpdate = false;
          var c = el.css('list-style-image');

          if (prevColors != c) {
            prevColors = c;
            upateColors();
            shouldUpdate = true;
          }

          var backgroundImage = el.attr('data-background-image');
          if (prevBackgroundImage != backgroundImage) {
            prevBackgroundImage = backgroundImage;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            update();
          }
        }
        else {
          clearTimeout(timerId);
        }
      }, 70);
    }
  });
})();
