/**
 * @module BaseFilter
 * @submodule Models
 * @class Tree
 * @constructor
 * @extends Backbone.TreeModel
 * @uses Logger
 * @uses BaseEvents
 */
define([
  'amd!cdf/lib/underscore',
  'amd!cdf/lib/backbone.treemodel',
  'cdf/lib/BaseEvents'
], function (_, Backbone, BaseEvents) {

  var Tree = BaseEvents.extendWithEvents(Backbone.TreeModel).extend({
    children: function () {
      return this.nodes.apply(this, arguments);
    },

    /**
     * walk down the tree and do stuff:
     * 1. if the node has no children, call itemCallback and get the result
     * 2. if the node has children, run child.walk for every child and combine the array of results with combineCallback
     *
     *
     *     function combineCallback(array, model){
     *         return _.all(array);
     *     }
     *
     * @method walkDown
     * @param {function} itemCallback
     * @param {function} combineCallback
     * @param {function} alwaysCallback
     */
    walkDown: function(itemCallback, combineCallback, alwaysCallback) {
      var _combine = combineCallback;
      var _always = alwaysCallback;

      if (!_.isFunction(combineCallback)) {
        _combine = _.identity;
      }
      if (!_.isFunction(alwaysCallback)) {
        _always = null;
      }
      return this._walkDown(itemCallback, _combine, _always);
    },

    _walkDown: function (itemCb, combineCb, alwaysCb) {
      var result;

      var children = this.children();
      if (children) {
        result = combineCb(children.map(function (child) {
          return child._walkDown(itemCb, combineCb, alwaysCb);
        }), this);
      } else {
        result = itemCb(this);
      }
      if (alwaysCb) {
        result = alwaysCb(this, result);
      }
      return result;
    },

    /**
     * Returns self and descendants as a flat list
     * @method flatten
     * @return {Underscore} Returns a wrapped Underscore object using _.chain()
     */
    flatten: function() {
      return _.chain(
        this._walkDown(_.identity, function(children, parent) {
          children.push(parent);
          return children;
        })
      ).flatten()
    },

    /**
     * Returns just the leaf-level descendants of a given node
     * @return {Underscore} Returns a wrapped Underscore object using _.chain()
     */
    leafs: function(){
      return this.flatten().filter(function(m){
        return m.children() === null;
      });
    }
  });

  return Tree;
});
