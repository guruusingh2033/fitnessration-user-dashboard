
function setPropertyPath(obj, prop, value) {
  if (typeof prop === "string")
      prop = prop.split(".");

  if (prop.length > 1) {
      var e = prop.shift();
      setPropertyPath(obj[e] =
               Object.prototype.toString.call(obj[e]) === "[object Object]"
               ? obj[e]
               : {},
             prop,
             value);
  } else
      obj[prop[0]] = value;
}

function getPropertyPath(obj, prop) {
  if (typeof prop === "string")
      prop = prop.split(".");

  if (prop.length > 1) {
      var e = prop.shift();
      return getPropertyPath(obj[e] =
               Object.prototype.toString.call(obj[e]) === "[object Object]"
               ? obj[e]
               : {},
             prop);
  } else
      return obj[prop[0]];

}

export default function mongoProperty(obj, objName, id, doc, documentProperty) {
  Object.defineProperty(obj, objName, {
    configurable: true,
    get: function() {
      var _doc = typeof doc == 'function' ? doc() : doc
      if (_doc) {
        return getPropertyPath(typeof doc == 'function' ? doc() : doc, documentProperty);
      }
    },
    set: function(value) {
      var _doc = typeof doc == 'function' ? doc() : doc
      if (_doc) {
        setPropertyPath(_doc, documentProperty, value);
        var data = {};
        data[documentProperty] = value;
        Meteor.users.update({_id:id}, {'$set':data});
      }
    }
  });
}
