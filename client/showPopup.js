export default function showPopup(opts) {
  if (opts.showClose == undefined) opts.showClose = true;
  var el = $($('#popupTemplate').html());
  function close() {
    el.remove();
  }
  if (opts.showClose) {
    el.find('.popup__close').click(function() {
      close();
      return false;
    });    
  }
  else {
    el.find('.popup__close').remove();
  }
  el.addClass(opts.type);
  if (opts.type == 'basic-popup-with-title') {
    el.find('.popup__title').html(opts.title);
  }
  el.find('.popup__content').append($(opts.content));
  if (opts.class) {
  	el.find('.popup__content').addClass(opts.class);
  }
  if (opts.id) {
  	el.find('.popup__content').attr('id', opts.id);
  }
  $('body').append(el);
  if (opts.init) {
  	opts.init({el:el, close:close});
  }
  return {el:el, close:close};
}
